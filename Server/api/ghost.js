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
// ⚠️ If you want your custom voice, paste the ID here.
// Currently set to "Brian" (Standard American Male) as a fallback.
const VOICE_ID = 'nPczCjzI2devNBz1zQrb'; 

// Initialize Clients (Using .env variables from server.js)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

// --- ROUTE 1: WAKE UP ---
router.post('/wake-up', async (req, res) => {
  try {
    console.log('🔔 Call connected. Waking up Dad...');

    // 1. Generate Natural Greeting
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `
      Roleplay: You are a protective, caring father named Jim. 
      Your daughter just called you unexpectedly. You are worried but trying to stay calm.
      Task: Answer the phone naturally. Ask if she is okay or where she is.
      Style: Conversational, comforting, realistic. Not too short.
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
        model_id: "eleven_turbo_v2",
        optimize_streaming_latency: 2
      },
      responseType: 'arraybuffer'
    });

    res.set('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    console.error('❌ Wake-up failed:', error.message);
    res.status(500).json({ error: 'Failed to wake up' });
  }
});

// --- ROUTE 2: TALK AUDIO ---
router.post('/talk-audio', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  let newPath = null; // Defined here so 'finally' can see it

  try {
    const audioFile = req.file;
    if (!audioFile) return res.status(400).json({ error: 'No audio sent' });

    // --- FIX: RENAME FILE FOR GROQ ---
    newPath = audioFile.path + '.m4a';
    fs.renameSync(audioFile.path, newPath);

    console.log('1. Audio received. Sending to Groq...');

    // 1. Hearing (Groq Whisper)
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    });

    const userText = transcription.text;
    console.log(`2. User said: "${userText}"`);

    // 2. Thinking (Gemini 1.5 Flash)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Roleplay: You are a protective father named Jim. 
      The user (your daughter) just said: "${userText}"
      Task: Respond naturally. If she sounds scared, be reassuring.
      Style: Speak like a real parent. Conversational (1-2 sentences).
    `;

    const geminiResult = await model.generateContent(prompt);
    const dadResponse = geminiResult.response.text();
    console.log(`3. Gemini replied: "${dadResponse}"`);

    // 3. Speaking (ElevenLabs)
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
    res.status(500).json({ error: 'Processing failed' });

  } finally {
    // --- SAFETY CHECK ---
    // Always delete the temp file from the server, even if it crashed.
    if (newPath && fs.existsSync(newPath)) {
      try {
        fs.unlinkSync(newPath);
        console.log('🧹 Server Cleanup: Temp audio deleted.');
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    }
  }
});

module.exports = router;