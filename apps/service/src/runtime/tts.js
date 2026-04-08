import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';

const ADAPTERS = {
  kokoro:  () => import('./adapters/voice/kokoro.js'),
  piper:   () => import('./adapters/voice/piper.js'),
  default: () => import('./adapters/voice/openai-tts.js'),
};

let adapter = null;

export async function init() {
  let provider = 'default';
  try {
    const hardware = await detect();
    const profile = await getProfile(hardware);
    provider = profile?.tts?.provider ?? 'default';
  } catch {}
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
