import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { toBase64 } from './utils/base64.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));

if (process.env.ENABLE_CORS === 'true') {
  app.use(cors());
}

const PORT = process.env.PORT || 3000;
const ELEVEN_API = 'https://api.elevenlabs.io/v1/text-to-speech';

// --- NUEVO ENDPOINT GET: /tts-stream?text=...&voice_id=...&model_id=...
import { Readable } from 'stream';

app.get('/tts-stream', async (req, res) => {
  try {
    const text = (req.query.text || '').toString();
    const voiceId = (req.query.voice_id || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').toString();
    const modelId = (req.query.model_id || process.env.DEFAULT_MODEL_ID || 'eleven_multilingual_v2').toString();

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(400).json({ error: 'Falta ELEVENLABS_API_KEY en el servidor' });
    }
    if (!text.trim()) {
      return res.status(400).json({ error: 'Falta el parámetro text' });
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const payload = {
      text,
      model_id: modelId,
      // Ajustes opcionales (puedes exponerlos como query si quieres)
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      },
      optimize_streaming_latency: 0
    };

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg' // <- devuelve bytes MP3 progresivos
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: 'Error de ElevenLabs', details: errText });
    }

    // Encabezados para audio progresivo (el navegador puede reproducir mientras llega)
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    // Si usas CORS:
    if (process.env.ENABLE_CORS === 'true') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Pipea el stream de ElevenLabs hacia la respuesta
    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.on('error', (e) => {
      console.error('Stream error:', e);
      res.destroy(e);
    });
    nodeStream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno', details: String(e) });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

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
      return res.status(400).json({ error: 'Falta ELEVENLABS_API_KEY en el servidor' });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Falta el campo text' });
    }

    const voiceId = voice_id || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const modelId = model_id || process.env.DEFAULT_MODEL_ID || 'eleven_multilingual_v2';

    const url = `${ELEVEN_API}/${voiceId}${format === 'wav' ? '?output_format=wav' : ''}`;

    const payload = {
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost
      },
      optimize_streaming_latency
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(resp.status).json({ error: 'Error de ElevenLabs', details: txt });
    }

    const buf = Buffer.from(await resp.arrayBuffer());

    if (process.env.RETURN_BASE64 === 'true') {
      const b64 = toBase64(buf);
      return res.json({ mime: 'audio/mpeg', audio_base64: b64 });
    } else {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buf.length);
      return res.send(buf);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno', details: String(err) });
  }
});

// Servir archivos estáticos en /public
app.use('/public', express.static('public'));

// Redirigir raíz a la página de prueba
app.get('/', (req, res) => {
  res.redirect('/public/test.html');
});

app.listen(PORT, () => {
  console.log(`TTS proxy escuchando en http://localhost:${PORT}`);
});

