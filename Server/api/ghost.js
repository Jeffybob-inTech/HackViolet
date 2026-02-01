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

// --- ROUTE 1: WAKE UP ---
router.post('/wake-up', async (req, res) => {
  try {
    console.log('🔔 Call connected. Waking up Dad...');

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Roleplay: You are a protective father named Jim. 
      Your daughter just called. Answer the phone naturally. Preferably only 1-2 sentences.
      CRITICAL: ONLY write the spoken words. No *actions*.
    `;

    const result = await model.generateContent(prompt);
    const introText = result.response.text();
    console.log(`🗣️ Dad says: "${introText}"`);

    // 2. Generate Audio
    const audioResponse = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        text: introText,
        model_id: "eleven_turbo_v2_5", 
        // 0 = Max Speed (Lowest Latency)
        optimize_streaming_latency: 0
      },
      responseType: 'arraybuffer'
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


    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Roleplay: Protective father Jim. User said: "${userText}"
      Task: Respond naturally. Speak like a real parent. Preferably natural with only 1-2 sentences.
      CRITICAL: ONLY write the spoken words. No *actions*.
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
        model_id: "eleven_turbo_v2_5",
        //STAY 0 = Max Speed (Lowest Latency)
        optimize_streaming_latency: 0
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