import { getConfig } from '../config.js';
import { resolveModel, modelsForCapability } from '../engine/registry.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';

// Legacy adapter map — used as final fallback when no engine is available
// adapters/voice/openai-tts is the default cloud fallback
const ADAPTERS = {
  'macos-say': () => import('./adapters/voice/macos-say.js'),
  piper:       () => import('./adapters/voice/piper.js'),
  kokoro:      () => import('./adapters/voice/kokoro.js'),
  elevenlabs:  () => import('./adapters/voice/elevenlabs.js'),
  openai:      () => import('./adapters/voice/openai-tts.js'),
  default:     () => import('./adapters/voice/openai-tts.js'),
};

let _resolved = null;  // { engine, modelName } from registry
let _adapter = null;    // legacy adapter fallback

export async function init() {
  _resolved = null;
  _adapter = null;

  const config = await getConfig();
  const assignments = config.assignments || {};

  // 1. Try assigned model via registry
  if (assignments.tts) {
    const r = await resolveModel(assignments.tts);
    if (r?.engine?.run) { _resolved = r; return; }
  }

  // 2. Try engine discovery for 'tts' capability
  const models = await modelsForCapability('tts');
  if (models.length > 0) {
    const r = await resolveModel(models[0].id);
    if (r?.engine?.run) { _resolved = r; return; }
  }

  // 3. Legacy adapter fallback — read config.tts.provider or platform default
  let provider = config.tts?.provider || (process.platform === 'darwin' ? 'macos-say' : 'default');
  const load = ADAPTERS[provider] ?? ADAPTERS.default;
  try {
    const mod = await load();
    _adapter = mod.synthesize ? mod : mod.default;
  } catch {
    const mod = await ADAPTERS.default();
    _adapter = mod.synthesize ? mod : mod.default;
  }
}

export async function synthesize(text) {
  if (!_resolved && !_adapter) throw new Error('not initialized');
  if (!text || !text.trim())
    throw Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' });

  startMark('tts');
  const t0 = Date.now();
  let result;

  if (_resolved) {
    result = await _resolved.engine.run(_resolved.modelName, { text });
  } else {
    result = await _adapter.synthesize(text);
  }

  synthesize._lastMs = endMark('tts');
  record('tts', Date.now() - t0);
  return result;
}
