import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Readable } from 'stream';
import { toBase64 } from './utils/base64.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS opcional (actívalo en Railway con ENABLE_CORS=true)
if (process.env.ENABLE_CORS === 'true') {
  app.use(cors());
}

const PORT = process.env.PORT || 3000;
const ELEVEN_API = 'https://api.elevenlabs.io/v1/text-to-speech';

// Salud
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// --- TTS BASE64 (POST /tts) ---
app.post('/tts', async (req, res) => {
  try {
    const {
      text,
      voice_id,
      model_id,
      optimize_streaming_latency = 0,
      stability = 0.5,
      similarity_boost = 0.75,
      style = 0.0,
      use_speaker_boost = true,
      format = 'mp3'
    } = req.body || {};

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(400).json({ error: 'Falta ELEVENLABS_API_KEY en
