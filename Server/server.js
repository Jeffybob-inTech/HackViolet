require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { supabase } = require("./supabase");
const { sendPush } = require("./push");

const ghostRoutes = require('./api/ghost')

const app = express();

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
  if (!pushToken) return res.status(400).json({ error: "missing_push_token" });

  const { data, error } = await supabase
    .from("devices")
    .insert({ push_token: pushToken })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "db_error" });
  }
  console.log("device register")
  res.json({ deviceId: data.id });
});
// gets teh user locations
app.get("/locations", async (_req, res) => {
  const { data, error } = await supabase
    .from("locations")
    .select("device_id, lat, lng, accuracy, updated_at");

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "db_error" });
  }

  res.json(data);
});

/* ---------- update location ---------- */
app.post("/location", async (req, res) => {
  const { deviceId, lat, lng, accuracy } = req.body || {};
  if (!deviceId || lat == null || lng == null) {
    return res.status(400).json({ error: "bad_request" });
  }

  const { error } = await supabase
    .from("locations")
    .upsert({
      device_id: deviceId,
      lat,
      lng,
      accuracy: accuracy ?? null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "db_error" });
  }
  console.log("got location")
  res.json({ ok: true });
});

/* ---------- CALL / PING ---------- */
app.post("/call", async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "missing_deviceId" });

  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("lat, lng, accuracy")
    .eq("device_id", deviceId)
    .single();

  if (locErr || !loc) {
    return res.status(400).json({ error: "no_location" });
  }

  const { data: targets, error: tgtErr } = await supabase
    .from("devices")
    .select("push_token")
    .neq("id", deviceId)
    .not("push_token", "is", null);

  if (tgtErr) {
    console.error(tgtErr);
    return res.status(500).json({ error: "db_error" });
  }
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
  console.log("made call")
  res.json({ ok: true });
});

app.use('/api', ghostRoutes);

/* ---------- start ---------- */
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`server running on :${port}`);
});
