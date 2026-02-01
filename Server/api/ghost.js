const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk'); 
const axios = require('axios');

const upload = multer({ dest: 'uploads/' });

// Initialize APIs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const VOICE_ID = 'nPczCjzI2devNBz1zQrb'; // "Brian"

// --- ROUTE 1: WAKE UP (The Intro) ---
// Triggered when call connects. AI speaks first.
router.post('/wake-up', async (req, res) => {
  try {
    console.log('Call connected. Waking up Dad...');

    // 1. Generate Greeting Text
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const prompt = `
      Roleplay: You are an overprotective father named Jim. 
      Your daughter just picked up the phone. She is in a potentially unsafe situation.
      
      Task: Say a short, protective greeting. 
      Examples: "Hi honey, I'm here." or "I've got you on the map."
      Constraint: Keep it under 10 words.
    `;
    
    const result = await model.generateContent(prompt);
    const introText = result.response.text();
    console.log(`Dad says intro: "${introText}"`);

    // 2. Generate Audio (Turbo)
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
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        optimize_streaming_latency: 2
      },
      responseType: 'arraybuffer'
    });

    // 3. Send MP3
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    console.error('Wake-up failed:', error.message);
    res.status(500).json({ error: 'Failed to wake up' });
  }
});

// --- ROUTE 2: TALK AUDIO (The Conversation) ---
// Triggered when you finish speaking.
router.post('/talk-audio', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  try {
    const audioFile = req.file; 
    if (!audioFile) return res.status(400).json({ error: 'No audio sent' });

    console.log('1. Audio received. Sending to Groq...');

    // --- STEP 1: TRANSCRIPTION (Groq Whisper) ---
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.path),
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    });
    
    const userText = transcription.text;
    console.log(`2. User said (${Date.now() - startTime}ms): "${userText}"`);

    fs.unlinkSync(audioFile.path); // Cleanup temp file

    // --- STEP 2: INTELLIGENCE (Gemini) ---
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const prompt = `
      Roleplay: You are an overprotective father named Jim. 
      User said: "${userText}"
      Respond in LESS than 15 words. Be protective. No emojis.
    `;
    
    const geminiResult = await model.generateContent(prompt);
    const dadResponse = geminiResult.response.text();
    console.log(`3. Gemini replied: "${dadResponse}"`);

    // --- STEP 3: VOICE GENERATION (ElevenLabs Turbo) ---
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
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        optimize_streaming_latency: 2
      },
      responseType: 'arraybuffer'
    });

    console.log(`4. Audio generated. Sending back (Total: ${Date.now() - startTime}ms)`);

    res.set('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    console.error('Error in pipeline:', error.message);
    res.status(500).json({ error: 'Processing failed' });
  }
});

module.exports = router;