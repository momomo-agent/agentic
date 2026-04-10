import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';

const ADAPTERS = {
  sensevoice: () => import('./adapters/voice/sensevoice.js'),
  whisper:    () => import('./adapters/voice/whisper.js'),
  default:    () => import('./adapters/voice/openai-whisper.js'),
};

let adapter = null;

export async function init() {
  let provider = 'default';
  try {
    const hardware = await detect();
    const profile = await getProfile(hardware);
    provider = profile?.stt?.provider ?? 'default';
  } catch {}

  const load = ADAPTERS[provider] ?? ADAPTERS.default;
  try {
    adapter = await load();
    // If adapter has a health check, verify it's reachable
    if (adapter.check) await adapter.check();
  } catch {
    // Fallback chain: sensevoice → whisper → openai
    const fallbacks = ['sensevoice', 'whisper', 'default'].filter(k => k !== provider);
    for (const fb of fallbacks) {
      try {
        adapter = await ADAPTERS[fb]();
        if (adapter.check) await adapter.check();
        break;
      } catch { adapter = null; }
    }
    if (!adapter) adapter = await ADAPTERS.default();
  }
}

export async function transcribe(audioBuffer) {
  if (!adapter) throw new Error('not initialized');
  if (!audioBuffer || audioBuffer.length === 0)
    throw Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' });
  startMark('stt');
  const t0 = Date.now();
  const result = await adapter.transcribe(audioBuffer);
  transcribe._lastMs = endMark('stt');
  record('stt', Date.now() - t0);
  return result;
}
