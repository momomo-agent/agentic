import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

export async function synthesize(text) {
  let ttsConfig = {};
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    ttsConfig = JSON.parse(raw).tts || {};
  } catch {}

  const apiKey = ttsConfig.apiKey || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('ElevenLabs API key not set'), { code: 'NO_API_KEY' });
  }

  const voiceId = ttsConfig.voiceId || 'JBFqnCBsd6RMkjVDRZzb'; // default: George
  const baseUrl = ttsConfig.baseUrl || 'https://api.elevenlabs.io/v1';

  const res = await fetch(`${baseUrl}/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1.0,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(
      new Error(`ElevenLabs TTS failed: ${res.status} ${body}`),
      { code: res.status }
    );
  }

  return Buffer.from(await res.arrayBuffer());
}
