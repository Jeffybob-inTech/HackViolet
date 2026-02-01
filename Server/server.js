require("dotenv").config();
console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:.+@/, ":***@"));

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { q } = require("./db");
const { sendPush } = require("./push");

const app = express();

/* ---------- middleware ---------- */

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

app.set("trust proxy", 1);

/* ---------- health ---------- */

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/* ---------- register device ---------- */

app.post("/devices/register", async (req, res) => {
  const { pushToken } = req.body || {};

  const rows = await q(
    `insert into devices (push_token)
     values ($1)
     returning id`,
    [pushToken ?? null]
  );

  res.json({ deviceId: rows[0].id });
});

// --- WAKE-UP STUB (no-op, never errors) ---
app.post("/api/wake-up", async (_req, res) => {
  try {
    // Frontend expects an audio blob
    res.setHeader("Content-Type", "audio/mpeg");

    // Send 1 second of silence (valid audio)
    const silentMp3 = Buffer.from([
      0x49,0x44,0x33, // ID3 header (minimal valid MP3)
      0x03,0x00,0x00,0x00,0x00,0x00,0x21
    ]);

    res.status(200).send(silentMp3);
  } catch {
    // Absolute fallback — NEVER crash
    res.status(200).end();
  }
});

// --- TALK-AUDIO STUB (echo silence) ---
app.post("/api/talk-audio", async (_req, res) => {
  res.setHeader("Content-Type", "audio/mpeg");
  res.status(200).send(Buffer.alloc(0));
});

/* ---------- update location ---------- */

app.post("/location", async (req, res) => {
  const { deviceId, lat, lng, accuracy } = req.body || {};

  if (!deviceId || lat == null || lng == null) {
    return res.status(400).json({ error: "bad_request" });
  }

  await q(
    `insert into locations (device_id, lat, lng, accuracy, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (device_id)
     do update set
       lat = excluded.lat,
       lng = excluded.lng,
       accuracy = excluded.accuracy,
       updated_at = now()`,
    [deviceId, lat, lng, accuracy ?? null]
  );

  res.json({ ok: true });
});

/* ---------- CALL / PING ---------- */

app.post("/call", async (req, res) => {
  const { deviceId } = req.body || {};

  if (!deviceId) {
    return res.status(400).json({ error: "missing_deviceId" });
  }

  // 1️⃣ Get caller location
  const loc = await q(
    `select lat, lng, accuracy
     from locations
     where device_id = $1`,
    [deviceId]
  );

  if (!loc[0]) {
    return res.status(400).json({ error: "no_location" });
  }

  // 2️⃣ Get all other devices
  const targets = await q(
    `select push_token
     from devices
     where push_token is not null
       and id != $1`,
    [deviceId]
  );

  // 3️⃣ Broadcast push
  await Promise.all(
    targets.map(t =>
      sendPush(
        t.push_token,
        "📍 Incoming Ping",
        "Someone is calling you",
        {
          type: "PING",
          lat: loc[0].lat,
          lng: loc[0].lng,
          accuracy: loc[0].accuracy,
          from: deviceId,
        }
      )
    )
  );

  res.json({ ok: true });
});


/* ---------- start ---------- */

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`server running on :${port}`);
});
