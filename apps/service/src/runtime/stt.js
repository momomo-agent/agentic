import { getConfig } from '../config.js';
import { resolveModel, modelsForCapability } from '../engine/registry.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';

// Legacy adapter map — used as final fallback when no engine is available
// adapters/voice/openai-whisper is the default cloud fallback
const ADAPTERS = {
  sensevoice: () => import('./adapters/voice/sensevoice.js'),
  whisper:    () => import('./adapters/voice/whisper.js'),
  default:    () => import('./adapters/voice/openai-whisper.js'),
};

let _resolved = null;  // { engine, modelName } from registry
let _adapter = null;    // legacy adapter fallback

export async function init() {
  _resolved = null;
  _adapter = null;

  const config = await getConfig();
  const assignments = config.assignments || {};

  // 1. Try assigned model via registry
  if (assignments.stt) {
    const r = await resolveModel(assignments.stt);
    if (r?.engine?.run) { _resolved = r; return; }
  }

  // 2. Try engine discovery for 'stt' capability
  const models = await modelsForCapability('stt');
  if (models.length > 0) {
    const r = await resolveModel(models[0].id);
    if (r?.engine?.run) { _resolved = r; return; }
  }

  // 3. Legacy adapter fallback — read config.stt.provider
  const provider = config.stt?.provider || 'default';
  const load = ADAPTERS[provider] ?? ADAPTERS.default;
  try {
    const mod = await load();
    _adapter = mod.transcribe ? mod : mod.default;
    if (_adapter.check) await _adapter.check();
  } catch {
    const fallbacks = ['sensevoice', 'whisper', 'default'].filter(k => k !== provider);
    for (const fb of fallbacks) {
      try {
        const mod = await ADAPTERS[fb]();
        _adapter = mod.transcribe ? mod : mod.default;
        if (_adapter.check) await _adapter.check();
        break;
      } catch { _adapter = null; }
    }
    if (!_adapter) {
      const mod = await ADAPTERS.default();
      _adapter = mod.transcribe ? mod : mod.default;
    }
  }
}

export async function transcribe(audioBuffer) {
  if (!_resolved && !_adapter) throw new Error('not initialized');
  if (!audioBuffer || audioBuffer.length === 0)
    throw Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' });

  startMark('stt');
  const t0 = Date.now();
  let result;

  if (_resolved) {
    result = await _resolved.engine.run(_resolved.modelName, { audioBuffer });
  } else {
    result = await _adapter.transcribe(audioBuffer);
  }

  transcribe._lastMs = endMark('stt');
  record('stt', Date.now() - t0);
  return result;
}
