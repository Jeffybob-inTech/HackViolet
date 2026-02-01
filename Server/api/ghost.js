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
const VOICE_ID = 'WzpxTcpqXE1YZwSZOldz'; 

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

// --- DEBUG HELPER ---
const logEnvCheck = () => {
  const key = process.env.ELEVEN_LABS_API_KEY;
  console.log("🔍 --- DEBUG ENV CHECK ---");
  console.log(`🔑 Key Loaded: ${key ? "YES" : "NO"}`);
  console.log(`📏 Key Length: ${key ? key.length : 0}`);
  console.log(`🆔 Voice ID: ${VOICE_ID}`);
  console.log(`📡 URL: https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`);
  if (key && key.trim() !== key) console.warn("⚠️ WARNING: API KEY HAS HIDDEN SPACES!");
  console.log("-------------------------");
};

// --- ROUTE 1: WAKE UP ---
router.post('/wake-up', async (req, res) => {
  try {
    console.log('🔔 Call connected. Waking up Dad...');
    
    // RUN DEBUG CHECK
    logEnvCheck();

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `
      Roleplay: You are a protective father named Jim. 
      Your daughter just called. Answer the phone naturally.
      CRITICAL: ONLY write the spoken words. No *actions*. Keep it under 20 words.
    `;

    const result = await model.generateContent(prompt);
    const introText = result.response.text();
    console.log(`🗣️ Dad says: "${introText}"`);

    // 2. Generate Audio
    console.log("🚀 Sending request to ElevenLabs...");
    const audioResponse = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVEN_LABS_API_KEY, // <--- This is where it usually fails
        'Content-Type': 'application/json',
      },
      data: {
        text: introText,
        model_id: "eleven_turbo_v2",
        optimize_streaming_latency: 2
      },
      responseType: 'arraybuffer'
    });

    console.log("✅ Audio received from ElevenLabs");
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    console.error('❌ Wake-up failed:', error.message);
    
    // --- DETAILED ERROR LOGGING ---
    if (error.response) {
        console.error("🛑 ELEVENLABS ERROR DETAILS:");
        console.error(`👉 Status: ${error.response.status}`);
        // Convert buffer to string to see the text error
        const errorData = Buffer.isBuffer(error.response.data) 
            ? error.response.data.toString() 
            : JSON.stringify(error.response.data);
        console.error(`👉 Message: ${errorData}`);
    }
    
    res.status(500).json({ error: 'Failed to wake up' });
  }
});

// --- ROUTE 2: TALK AUDIO ---
router.post('/talk-audio', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  let newPath = null; 

  try {
    const audioFile = req.file;
    if (!audioFile) return res.status(400).json({ error: 'No audio sent' });

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Roleplay: Protective father Jim. User said: "${userText}"
      Task: Respond naturally. Speak like a real parent.
    `;

    const geminiResult = await model.generateContent(prompt);
    const dadResponse = geminiResult.response.text();
    console.log(`3. Gemini replied: "${dadResponse}"`);

    // DEBUG CHECK AGAIN
    logEnvCheck();
    
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
        model_id: "eleven_turbo_v2",
        optimize_streaming_latency: 2
      },
      responseType: 'arraybuffer'
    });

    console.log(`4. Audio generated (Latency: ${Date.now() - startTime}ms)`);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
    if (error.response) {
        console.error("🛑 ELEVENLABS ERROR DETAILS:");
        const errorData = Buffer.isBuffer(error.response.data) 
            ? error.response.data.toString() 
            : JSON.stringify(error.response.data);
        console.error(`👉 Message: ${errorData}`);
    }
    res.status(500).json({ error: 'Processing failed' });

  } finally {
    if (newPath && fs.existsSync(newPath)) fs.unlinkSync(newPath);
  }
});

module.exports = router;