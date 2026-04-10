/**
 * Kokoro TTS — local neural TTS via kokoro-tts HTTP server.
 * OpenAI-compatible /v1/audio/speech endpoint.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');
const DEFAULT_BASE_URL = 'http://localhost:8880';

export async function synthesize(text) {
  let ttsConfig = {};
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    ttsConfig = JSON.parse(raw).tts || {};
  } catch {}

  const baseUrl = ttsConfig.baseUrl || DEFAULT_BASE_URL;
  const voice = ttsConfig.voice || 'default';

  const res = await fetch(`${baseUrl}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, voice }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(
      new Error(`Kokoro TTS failed: ${res.status} ${body}`),
      { code: res.status }
    );
  }

  return Buffer.from(await res.arrayBuffer());
}
