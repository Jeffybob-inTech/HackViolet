const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const axios = require('axios');

// Configure Multer for temp storage
const upload = multer({ dest: 'uploads/' });

// --- CONFIGURATION ---
// Using the ID from your working test file
//const VOICE_ID = 'WzpxTcpqXE1YZwSZOldz'; 

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
// --- VOICE MAP (LOCKED) ---
const VOICE_BY_PERSONA = {
  Mom: "bze4nMV54zvNbyVWgS2p",
  Dad: "WzpxTcpqXE1YZwSZOldz",
  Friend: "tLgq4zzCK7t30VvheSvD",
};
let peronay;
// --- ROUTE 1: WAKE UP ---
router.post('/wake-up', async (req, res) => {
  try {
    const { persona, prompt } = req.body || {};
    peronay = persona
    console.log('🔔 Call connected. Waking up AI caller...');

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    // ---- SAFETY & FALLBACKS ----
    const allowedPersonas = Object.keys(VOICE_BY_PERSONA);

const safePersona = allowedPersonas.includes(persona)
  ? persona
  : "Dad";
const VOICE_ID = VOICE_BY_PERSONA[safePersona];

    const userPrompt =
      typeof prompt === "string" && prompt.trim()
        ? prompt.trim().slice(0, 400)
        : "Call and casually check in. Sound normal and calm.";
    console.log(userPrompt)
    // ---- SYSTEM WRAPPER (CRITICAL) ----
    const finalPrompt = `
Roleplay as ${safePersona}.
You are calling the user.

User intent:
"${userPrompt}"

RULES:
- Respond in spoken dialogue only
- No actions, no stage directions, no emojis
- Less than 20 words
- Never be the one to end the conversation
- Sound realistic and casual
- One short sentence preferred
`;
console.log("final prompt:", finalPrompt)
    const result = await model.generateContent(finalPrompt);
    const introText = result.response.text().trim();

    console.log(`🗣️ AI says: "${introText}"`);

    // ---- TTS ----
    const audioResponse = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      headers: {
        Accept: 'audio/mpeg',
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        text: introText,
        model_id: "eleven_flash_v2_5",
      },
      responseType: 'arraybuffer',
    });

    res.set('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    console.error('❌ Wake-up failed:', error.message);
    if (error.response) console.error(error.response.data);
    res.status(500).json({ error: 'Failed to wake up' });
  }
});


// --- ROUTE 2: TALK AUDIO ---
router.post('/talk-audio', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  let newPath = null; 

  try {
    const audioFile = req.file;
    const { persona } = req.body || {};

const allowedPersonas = Object.keys(VOICE_BY_PERSONA);
const safePersona = allowedPersonas.includes(persona)
  ? persona
  : "Dad";

const VOICE_ID = VOICE_BY_PERSONA[safePersona];


    if (!audioFile) return res.status(400).json({ error: 'No audio sent' });

    // Rename for Groq
    newPath = audioFile.path + '.m4a';
    fs.renameSync(audioFile.path, newPath);

    console.log('1. Audio received. Sending to Groq...');

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    });

    const userText = transcription.text;
    console.log(`2. User said: "${userText}"`);


    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
You are ${safePersona} on a phone call with the user.

Persona traits:
${safePersona === "Dad" ? "- Protective, calm, slightly concerned" : ""}
${safePersona === "Mom" ? "- Warm, reassuring, emotionally attentive" : ""}
${safePersona === "Friend" ? "- Casual, supportive, low-stress" : ""}

Conversation context:
User just said: "${userText}"

Rules (STRICT):
- Output spoken dialogue only
- One sentence
- Under 18 words
- Never end the call
- No questions unless natural
- Sound like a real human, not an assistant
`;


    const geminiResult = await model.generateContent(prompt);
    const dadResponse = geminiResult.response.text();
    console.log(`3. Gemini replied: "${dadResponse}"`);

    const audioResponse = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        text: dadResponse,
        model_id: "eleven_flash_v2_5",
        //STAY 0 = Max Speed (Lowest Latency)
      },
      responseType: 'arraybuffer'
    });

    console.log(`4. Audio generated (Latency: ${Date.now() - startTime}ms)`);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
    if (error.response) console.error(error.response.data);
    res.status(500).json({ error: 'Processing failed' });

  } finally {
    if (newPath && fs.existsSync(newPath)) fs.unlinkSync(newPath);
  }
});

module.exports = router;