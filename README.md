# bolt-elevenlabs-tts-proxy

Micro-backend para convertir texto a audio con **ElevenLabs** y exponer un endpoint **/tts** fácil de usar desde **Bolt.new** (o cualquier cliente web).

## Endpoints

### POST /tts
Convierte texto en audio.

**Body (JSON):**
```json
{
  "text": "Hola, mundo",
  "voice_id": "opcional-voice-id",
  "model_id": "opcional-model-id",
  "optimize_streaming_latency": 0,
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0.0,
  "use_speaker_boost": true,
  "format": "mp3"
}
