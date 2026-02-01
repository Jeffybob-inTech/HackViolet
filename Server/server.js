require("dotenv").config();
console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:.+@/, ":***@"));

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { supabase } = require("./supabase");

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

  const { data, error } = await supabase
  .from("devices")
  .select("push_token")
  .not("push_token", "is", null);

if (error) throw error;


  res.json({ deviceId: rows[0].id });
});

// --- WAKE-UP STUB (no-op, never errors) ---
app.post("/api/wake-up", (_req, res) => {
  // 0.25s of silence, 44.1kHz, mono, 16-bit PCM
  const wav = Buffer.from([
    0x52,0x49,0x46,0x46, // RIFF
    0x24,0x08,0x00,0x00, // file size
    0x57,0x41,0x56,0x45, // WAVE
    0x66,0x6d,0x74,0x20, // fmt
    0x10,0x00,0x00,0x00, // fmt length
    0x01,0x00,           // PCM
    0x01,0x00,           // mono
    0x44,0xac,0x00,0x00, // 44100 Hz
    0x88,0x58,0x01,0x00, // byte rate
    0x02,0x00,           // block align
    0x10,0x00,           // bits per sample
    0x64,0x61,0x74,0x61, // data
    0x00,0x08,0x00,0x00, // data length
    // silence
    ...new Array(2048).fill(0),
  ]);

  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Content-Length", wav.length);
  res.status(200).send(wav);
});


// --- TALK-AUDIO STUB (echo silence) ---
app.post("/api/talk-audio", (_req, res) => {
  res.setHeader("Content-Type", "audio/wav");
  res.status(200).send(Buffer.alloc(44)); // valid empty WAV header
});


/* ---------- update location ---------- */

app.post("/location", async (req, res) => {
  const { deviceId, lat, lng, accuracy } = req.body || {};

  if (!deviceId || lat == null || lng == null) {
    return res.status(400).json({ error: "bad_request" });
  }

  const { data, error } = await supabase
  .from("devices")
  .select("push_token")
  .not("push_token", "is", null);

if (error) throw error;


  res.json({ ok: true });
});

/* ---------- CALL / PING ---------- */

app.post("/call", async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "missing_deviceId" });

  const { data: loc } = await supabase
    .from("locations")
    .select("lat, lng, accuracy")
    .eq("device_id", deviceId)
    .single();

  if (!loc) return res.status(400).json({ error: "no_location" });

  const { data: targets } = await supabase
    .from("devices")
    .select("push_token")
    .neq("id", deviceId)
    .not("push_token", "is", null);

  await Promise.all(
    targets.map(t =>
      sendPush(
        t.push_token,
        "📍 Incoming Ping",
        "Someone is calling you",
        {
          type: "PING",
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
        }
      )
    )
  );
  console.log("Device imfo said")
  res.json({ ok: true });
});



/* ---------- start ---------- */

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`server running on :${port}`);
});
