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

  const apiKey = ttsConfig.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw Object.assign(new Error('OpenAI API key not set — configure in Admin > Config'), { code: 'NO_API_KEY' });

  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });
  const model = ttsConfig.model || 'tts-1';
  const voice = ttsConfig.voice || 'alloy';
  const res = await client.audio.speech.create({ model, voice, input: text });
  return Buffer.from(await res.arrayBuffer());
}
