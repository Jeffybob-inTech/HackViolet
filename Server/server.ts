import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { q } from "./db.ts";
import { signDeviceToken, verifyDeviceToken } from "./auth.ts";
import { sendPush } from "./push.ts";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: "200kb" }));

// Blunt anti-abuse. You can tune.
app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const h = req.header("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const payload = verifyDeviceToken(token);
    (req as any).deviceId = payload.deviceId;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Register device (anonymous)
 * Client stores token and uses it for all future calls.
 */
app.post("/v1/devices/register", async (req, res) => {
  const Body = z.object({
    nickname: z.string().min(1).max(40).optional(),
    phone: z.string().min(7).max(30).optional(),
    pushToken: z.string().min(5).max(300).optional()
  });

  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const rows = await q<{ id: string }>(
    `insert into devices (nickname, phone, push_token)
     values ($1, $2, $3)
     returning id`,
    [body.data.nickname ?? null, body.data.phone ?? null, body.data.pushToken ?? null]
  );

  const deviceId = rows[0]!.id;
  const token = signDeviceToken(deviceId);

  return res.json({ deviceId, token });
});

/**
 * Ping a circle with current location (ephemeral)
 */
app.post("/v1/ping", auth, async (req, res) => {
  const Body = z.object({
    circleId: z.string().uuid(),
  });
  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;

  // must be in circle
  const mem = await q(
    `select 1 from circle_members where circle_id=$1 and device_id=$2`,
    [body.data.circleId, deviceId]
  );
  if (mem.length === 0) return res.status(403).json({ error: "not_in_circle" });

  // grab latest location
  const loc = await q<{ lat: number; lng: number }>(
    `select lat, lng from locations where device_id=$1`,
    [deviceId]
  );

  if (!loc[0]) {
    return res.status(409).json({ error: "no_location" });
  }

  const { lat, lng } = loc[0];

  // get other members
  const targets = await q<{ push_token: string | null }>(
    `select d.push_token
     from circle_members cm
     join devices d on d.id = cm.device_id
     where cm.circle_id=$1 and cm.device_id != $2`,
    [body.data.circleId, deviceId]
  );

  await Promise.all(
    targets
      .filter(t => t.push_token)
      .map(t =>
        sendPush(
          t.push_token!,
          "📍 Ping",
          "Someone shared their location",
          { type: "PING", lat, lng }
        )
      )
  );

  res.json({ ok: true, lat, lng });
});


/**
 * Update device info (push token refresh, nickname, etc.)
 */
app.patch("/v1/devices/me", auth, async (req, res) => {
  const Body = z.object({
    nickname: z.string().min(1).max(40).optional(),
    phone: z.string().min(7).max(30).optional(),
    pushToken: z.string().min(5).max(300).optional()
  });

  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;

  await q(
    `update devices
     set nickname = coalesce($2, nickname),
         phone = coalesce($3, phone),
         push_token = coalesce($4, push_token),
         last_seen = now()
     where id = $1`,
    [deviceId, body.data.nickname ?? null, body.data.phone ?? null, body.data.pushToken ?? null]
  );

  res.json({ ok: true });
});

/**
 * Create circle (owner becomes member)
 */
app.post("/v1/circles", auth, async (req, res) => {
  const Body = z.object({ name: z.string().min(1).max(60).optional() });
  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;

  const circles = await q<{ id: string }>(
    `insert into circles (owner_device_id, name)
     values ($1, $2)
     returning id`,
    [deviceId, body.data.name ?? "My Circle"]
  );

  const circleId = circles[0]!.id;

  await q(
    `insert into circle_members (circle_id, device_id, role)
     values ($1, $2, 'owner')
     on conflict do nothing`,
    [circleId, deviceId]
  );

  res.json({ circleId });
});

/**
 * Generate invite code (shareable)
 */
app.post("/v1/circles/:circleId/invites", auth, async (req, res) => {
  const Params = z.object({ circleId: z.string().uuid() });
  const params = Params.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;
  const circleId = params.data.circleId;

  // must be a member
  const mem = await q(
    `select 1 from circle_members where circle_id=$1 and device_id=$2`,
    [circleId, deviceId]
  );
  if (mem.length === 0) return res.status(403).json({ error: "not_in_circle" });

  const code = cryptoRandomCode(8);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  const inv = await q<{ id: string; code: string; expires_at: string }>(
    `insert into invites (circle_id, created_by_device_id, code, expires_at)
     values ($1, $2, $3, $4)
     returning id, code, expires_at`,
    [circleId, deviceId, code, expiresAt.toISOString()]
  );

  res.json({ inviteId: inv[0]!.id, code: inv[0]!.code, expiresAt: inv[0]!.expires_at });
});

/**
 * Redeem invite code to join circle
 */
app.post("/v1/invites/redeem", auth, async (req, res) => {
  const Body = z.object({ code: z.string().min(4).max(32) });
  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;
  const code = body.data.code;

  const inv = await q<{ id: string; circle_id: string; expires_at: string; redeemed_at: string | null }>(
    `select id, circle_id, expires_at, redeemed_at
     from invites
     where code=$1`,
    [code]
  );
  if (inv.length === 0) return res.status(404).json({ error: "invite_not_found" });

  const row = inv[0]!;
  if (row.redeemed_at) return res.status(409).json({ error: "invite_already_used" });
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(410).json({ error: "invite_expired" });

  await q(`update invites set redeemed_at=now(), redeemed_by_device_id=$2 where id=$1`, [row.id, deviceId]);

  await q(
    `insert into circle_members (circle_id, device_id, role)
     values ($1, $2, 'member')
     on conflict do nothing`,
    [row.circle_id, deviceId]
  );

  res.json({ circleId: row.circle_id });
});

/**
 * Update location
 */
app.post("/v1/location", auth, async (req, res) => {
  const Body = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(10000).optional()
  });

  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;

  await q(
    `insert into locations (device_id, lat, lng, accuracy, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (device_id)
     do update set lat=excluded.lat, lng=excluded.lng, accuracy=excluded.accuracy, updated_at=now()`,
    [deviceId, body.data.lat, body.data.lng, body.data.accuracy ?? null]
  );

  res.json({ ok: true });
});

/**
 * Trigger alert -> push all circle members
 */
app.post("/v1/alerts", auth, async (req, res) => {
  const Body = z.object({
    circleId: z.string().uuid(),
    kind: z.enum(["need-exit", "check-in", "panic"]),
    message: z.string().max(240).optional()
  });
  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;

  // Must be in circle
  const mem = await q(`select 1 from circle_members where circle_id=$1 and device_id=$2`, [body.data.circleId, deviceId]);
  if (mem.length === 0) return res.status(403).json({ error: "not_in_circle" });

  // attach latest location if exists
  const loc = await q<{ lat: number; lng: number }>(
    `select lat, lng from locations where device_id=$1`,
    [deviceId]
  );

  const lat = loc[0]?.lat ?? null;
  const lng = loc[0]?.lng ?? null;

  const alertRows = await q<{ id: string }>(
    `insert into alerts (circle_id, triggered_by_device_id, kind, message, lat, lng)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [body.data.circleId, deviceId, body.data.kind, body.data.message ?? null, lat, lng]
  );

  const alertId = alertRows[0]!.id;

  // Push all members except sender
  const targets = await q<{ push_token: string | null; device_id: string; nickname: string | null }>(
    `select d.push_token, d.id as device_id, d.nickname
     from circle_members cm
     join devices d on d.id = cm.device_id
     where cm.circle_id = $1`,
    [body.data.circleId]
  );

  const sender = targets.find(t => t.device_id === deviceId);
  const senderName = sender?.nickname ?? "Someone";

  const title =
    body.data.kind === "panic" ? "🚨 Panic alert" :
    body.data.kind === "need-exit" ? "🆘 Needs an exit" :
    "✅ Check-in";

  const pushBody =
    body.data.message?.trim()
      ? `${senderName}: ${body.data.message.trim()}`
      : `${senderName} triggered an alert.`;

  await Promise.all(
    targets
      .filter(t => t.device_id !== deviceId)
      .map(t => t.push_token ? sendPush(
        t.push_token,
        title,
        pushBody,
        { type: "ALERT", alertId, circleId: body.data.circleId, kind: body.data.kind, lat, lng }
      ) : Promise.resolve())
  );

  res.json({ alertId });
});

/**
 * Resolve alert (only circle members)
 */
app.post("/v1/alerts/:alertId/resolve", auth, async (req, res) => {
  const Params = z.object({ alertId: z.string().uuid() });
  const params = Params.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = (req as any).deviceId as string;

  const rows = await q<{ circle_id: string }>(
    `select circle_id from alerts where id=$1`,
    [params.data.alertId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });

  const circleId = rows[0]!.circle_id;

  const mem = await q(`select 1 from circle_members where circle_id=$1 and device_id=$2`, [circleId, deviceId]);
  if (mem.length === 0) return res.status(403).json({ error: "not_in_circle" });

  await q(`update alerts set resolved_at=now() where id=$1 and resolved_at is null`, [params.data.alertId]);

  res.json({ ok: true });
});

function cryptoRandomCode(len: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`server listening on :${port}`));
