import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

async function getApiKey() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    return cfg.tts?.apiKey || cfg.stt?.apiKey || process.env.ELEVENLABS_API_KEY;
  } catch {
    return process.env.ELEVENLABS_API_KEY;
  }
}

export async function transcribe(audioBuffer) {
  const apiKey = await getApiKey();
  if (!apiKey) throw Object.assign(new Error('ElevenLabs API key not set'), { code: 'NO_API_KEY' });

  const blob = new Blob([audioBuffer], { type: 'audio/wav' });
  const form = new FormData();
  form.append('file', blob, 'audio.wav');
  form.append('model_id', 'scribe_v2');

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`ElevenLabs STT failed: ${res.status} ${body}`), { code: res.status });
  }

  const data = await res.json();
  return data.text || '';
}
