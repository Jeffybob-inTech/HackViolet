import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { q } from "./db";
import { sendPush } from "./push";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

app.use(rateLimit({
  windowMs: 60_000,
  limit: 100
}));

/* ---------------- HEALTH ---------------- */

app.get("/health", (_, res) => res.json({ ok: true }));

/* ---------------- REGISTER DEVICE ---------------- */

app.post("/devices/register", async (req, res) => {
  const Body = z.object({
    pushToken: z.string().optional()
  });

  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const rows = await q<{ id: string }>(
    `insert into devices (push_token)
     values ($1)
     returning id`,
    [body.data.pushToken ?? null]
  );

  res.json({ deviceId: rows[0].id });
});

/* ---------------- UPDATE LOCATION ---------------- */

app.post("/location", async (req, res) => {
  const Body = z.object({
    deviceId: z.string().uuid(),
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional()
  });

  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  await q(`
    insert into locations (device_id, lat, lng, accuracy, updated_at)
    values ($1, $2, $3, $4, now())
    on conflict (device_id)
    do update set
      lat = excluded.lat,
      lng = excluded.lng,
      accuracy = excluded.accuracy,
      updated_at = now()
  `, [
    body.data.deviceId,
    body.data.lat,
    body.data.lng,
    body.data.accuracy ?? null
  ]);

  res.json({ ok: true });
});

/* ---------------- CALL / PING ---------------- */

app.post("/call", async (req, res) => {
  const Body = z.object({
    deviceId: z.string().uuid()
  });

  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });

  const deviceId = body.data.deviceId;

  // Get caller location
  const loc = await q<{ lat: number; lng: number; accuracy: number | null }>(
    `select lat, lng, accuracy
     from locations
     where device_id = $1`,
    [deviceId]
  );

  if (!loc[0]) {
    return res.status(400).json({ error: "no_location" });
  }

  // Get all push targets except caller
  const targets = await q<{ push_token: string | null }>(
    `select push_token
     from devices
     where push_token is not null
       and id != $1`,
    [deviceId]
  );

  await Promise.all(
    targets.map(t =>
      t.push_token
        ? sendPush(
            t.push_token,
            "📍 Incoming Ping",
            "Someone is calling you",
            {
              type: "PING",
              from: deviceId,
              lat: loc[0].lat,
              lng: loc[0].lng,
              accuracy: loc[0].accuracy
            }
          )
        : Promise.resolve()
    )
  );

  res.json({ ok: true });
});

/* ---------------- START ---------------- */

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`server running on :${port}`);
});
