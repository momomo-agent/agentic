import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';

const ADAPTERS = {
  kokoro:     () => import('./adapters/voice/kokoro.js'),
  piper:      () => import('./adapters/voice/piper.js'),
  elevenlabs: () => import('./adapters/voice/elevenlabs.js'),
  openai:     () => import('./adapters/voice/openai-tts.js'),
  default:    () => import('./adapters/voice/openai-tts.js'),
};

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

let adapter = null;

export async function init() {
  let provider = 'default';
  try {
    // Check user config first
    const configPath = path.join(os.homedir(), '.agentic-service', 'config.json');
    const raw = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(raw);
    if (config.tts?.provider) {
      provider = config.tts.provider;
    } else {
      // Fall back to hardware profile
      const hardware = await detect();
      const profile = await getProfile(hardware);
      provider = profile?.tts?.provider ?? 'default';
    }
  } catch {
    try {
      const hardware = await detect();
      const profile = await getProfile(hardware);
      provider = profile?.tts?.provider ?? 'default';
    } catch {}
  }
  const load = ADAPTERS[provider] ?? ADAPTERS.default;
  try {
    const mod = await load();
    adapter = mod.synthesize ? mod : mod.default;
  } catch {
    const mod = await ADAPTERS.default();
    adapter = mod.synthesize ? mod : mod.default;
  }
}

export async function synthesize(text) {
  if (!adapter) throw new Error('not initialized');
  if (!text || !text.trim())
    throw Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' });
  startMark('tts');
  const t0 = Date.now();
  const result = await adapter.synthesize(text);
  synthesize._lastMs = endMark('tts');
  record('tts', Date.now() - t0);
  return result;
}
