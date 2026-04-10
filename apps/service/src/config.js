/**
 * 统一配置中心 — 唯一真相源
 *
 * 新架构：modelPool[] + assignments{} 替代旧的 llm/fallback 直接配置
 *
 * modelPool: 所有可用模型（本地 Ollama 自动检测 + 用户添加的云端模型）
 * assignments: 每个能力槽位（chat/vision/stt/tts/embedding/fallback）指向 pool 中的模型 ID
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.agentic-service');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const CAPABILITY_SLOTS = ['chat', 'vision', 'stt', 'tts', 'embedding', 'fallback'];

const DEFAULTS = {
  modelPool: [],
  assignments: { chat: null, vision: null, stt: null, tts: null, embedding: null, fallback: null },
  stt: { provider: 'whisper' },
  tts: { provider: 'kokoro', voice: 'default' },
  ollamaHost: 'http://localhost:11434',
};

let _cache = null;
const _listeners = new Set();

/**
 * 读取当前配置（带缓存）
 */
export async function getConfig() {
  if (_cache) return _cache;
  _cache = await _readFromDisk();
  return _cache;
}

/**
 * 写入配置并通知所有监听者
 */
export async function setConfig(updates) {
  const current = await getConfig();
  const merged = deepMerge(current, updates);
  await _writeToDisk(merged);
  _cache = merged;
  for (const fn of _listeners) {
    try { fn(merged); } catch (e) { console.warn('[config] listener error:', e.message); }
  }
}

/**
 * 用 profile 匹配结果初始化配置（仅 setup 时调用）
 */
export async function initFromProfile(profile, hardware) {
  let existing = null;
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    existing = JSON.parse(raw);
  } catch { /* no existing config */ }

  const config = existing
    ? deepMerge(deepMerge(DEFAULTS, profile), existing)
    : deepMerge(DEFAULTS, profile);

  config._hardware = hardware;
  config._profileSource = 'auto';

  await _writeToDisk(config);
  _cache = config;
}

export function onConfigChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export async function reloadConfig() {
  _cache = await _readFromDisk();
  for (const fn of _listeners) {
    try { fn(_cache); } catch (e) { console.warn('[config] listener error:', e.message); }
  }
  return _cache;
}

// ─── Model Pool helpers ───

/**
 * Get merged model pool: config modelPool + auto-detected Ollama models
 */
export async function getModelPool() {
  const config = await getConfig();
  const pool = [...(config.modelPool || [])];
  const ollamaHost = config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';

  try {
    const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const { models } = await res.json();
      for (const m of models) {
        const id = `ollama:${m.name}`;
        const existing = pool.find(p => p.id === id);
        if (existing) {
          // Refresh capabilities for existing models (fixes migrated models with incomplete caps)
          existing.capabilities = _guessOllamaCapabilities(m.name);
          if (!existing.size) existing.size = m.size;
        } else {
          pool.push({
            id,
            name: m.name,
            provider: 'ollama',
            capabilities: _guessOllamaCapabilities(m.name),
            source: 'auto',
            size: m.size,
          });
        }
      }
    }
  } catch { /* Ollama not running */ }

  return pool;
}

/**
 * Add a model to the pool (persisted to config)
 */
export async function addToPool(model) {
  const config = await getConfig();
  const pool = config.modelPool || [];
  if (pool.find(m => m.id === model.id)) {
    // Update existing
    const idx = pool.findIndex(m => m.id === model.id);
    pool[idx] = { ...pool[idx], ...model };
  } else {
    pool.push(model);
  }
  await setConfig({ modelPool: pool });
  return model;
}

/**
 * Remove a model from the pool by ID
 */
export async function removeFromPool(id) {
  const config = await getConfig();
  const pool = (config.modelPool || []).filter(m => m.id !== id);
  // Also clear any assignments pointing to this model
  const assignments = { ...(config.assignments || {}) };
  for (const slot of CAPABILITY_SLOTS) {
    if (assignments[slot] === id) assignments[slot] = null;
  }
  await setConfig({ modelPool: pool, assignments });
}

/**
 * Get current assignments
 */
export async function getAssignments() {
  const config = await getConfig();
  return config.assignments || DEFAULTS.assignments;
}

/**
 * Set assignments (partial update)
 */
export async function setAssignments(updates) {
  const config = await getConfig();
  const current = config.assignments || { ...DEFAULTS.assignments };
  const merged = { ...current, ...updates };
  await setConfig({ assignments: merged });
  return merged;
}

// ─── Auto-migration from old format ───

function _migrateOldFormat(parsed) {
  // Old format had: llm: { provider, model, apiKey, baseUrl, ollamaHost }, fallback: { provider, model, ... }
  if (parsed.llm && !parsed.modelPool) {
    const pool = [];
    const assignments = { chat: null, vision: null, stt: null, tts: null, embedding: null, fallback: null };

    const llm = parsed.llm;
    if (llm.provider === 'ollama' && llm.model) {
      const id = `ollama:${llm.model}`;
      pool.push({ id, name: llm.model, provider: 'ollama', capabilities: _guessOllamaCapabilities(llm.model), source: 'migrated' });
      assignments.chat = id;
    } else if (llm.provider && llm.model) {
      const id = `cloud:${llm.provider}:${llm.model}`;
      pool.push({
        id, name: llm.model, provider: llm.provider,
        apiKey: llm.apiKey, baseUrl: llm.baseUrl,
        capabilities: _guessCloudCapabilities(llm.provider, llm.model), source: 'migrated',
      });
      assignments.chat = id;
    }

    // Migrate fallback
    const fb = parsed.fallback;
    if (fb?.provider && fb.provider !== '') {
      if (fb.provider === 'ollama' && fb.model) {
        const id = `ollama:${fb.model}`;
        if (!pool.find(m => m.id === id)) {
          pool.push({ id, name: fb.model, provider: 'ollama', capabilities: _guessOllamaCapabilities(fb.model), source: 'migrated' });
        }
        assignments.fallback = id;
      } else if (fb.model) {
        const id = `cloud:${fb.provider}:${fb.model}`;
        if (!pool.find(m => m.id === id)) {
          pool.push({
            id, name: fb.model, provider: fb.provider,
            apiKey: fb.apiKey, baseUrl: fb.baseUrl,
            capabilities: _guessCloudCapabilities(fb.provider, fb.model), source: 'migrated',
          });
        }
        assignments.fallback = id;
      }
    }

    // Migrate vision
    if (parsed.vision?.model) {
      const vis = parsed.vision;
      const isCloud = vis.provider === 'cloud' || (vis.provider && vis.provider !== 'ollama');
      const id = isCloud ? `cloud:${vis.provider || 'openai'}:${vis.model}` : `ollama:${vis.model}`;
      if (!pool.find(m => m.id === id)) {
        pool.push({
          id, name: vis.model, provider: isCloud ? (vis.provider || 'openai') : 'ollama',
          apiKey: vis.apiKey, baseUrl: vis.baseUrl,
          capabilities: ['vision'], source: 'migrated',
        });
      }
      assignments.vision = id;
    }

    // Migrate providers to pool
    if (parsed.providers) {
      for (const [pid, pval] of Object.entries(parsed.providers)) {
        if (pval.enabled && pval.apiKey) {
          const id = `cloud:${pid}:default`;
          if (!pool.find(m => m.id === id)) {
            pool.push({
              id, name: `${pid} (migrated)`, provider: pid,
              apiKey: pval.apiKey, baseUrl: pval.baseUrl,
              capabilities: ['chat'], source: 'migrated',
            });
          }
        }
      }
    }

    parsed.modelPool = pool;
    parsed.assignments = assignments;
    // Preserve ollamaHost at top level
    if (llm.ollamaHost) parsed.ollamaHost = llm.ollamaHost;
  }
  return parsed;
}

function _guessOllamaCapabilities(name) {
  const lower = name.toLowerCase();
  const caps = ['chat'];
  if (/llava|moondream|gemma4|bakllava|cogvlm/.test(lower)) caps.push('vision');
  if (/whisper/.test(lower)) caps.push('stt');
  if (/embed|nomic|mxbai|bge/.test(lower)) {
    return ['embedding'];
  }
  return caps;
}

function _guessCloudCapabilities(provider, model) {
  const caps = ['chat'];
  const lower = (model || '').toLowerCase();
  // Vision-capable cloud models
  if (/gpt-4o|gpt-4-turbo|gpt-4-vision|claude-3|claude-sonnet|claude-opus|gemini/.test(lower)) {
    caps.push('vision');
  }
  // Embedding models
  if (/embed|ada-002|text-embedding/.test(lower)) {
    return ['embedding'];
  }
  // TTS models
  if (/tts|speech/.test(lower)) {
    return ['tts'];
  }
  // STT models
  if (/whisper|stt/.test(lower)) {
    return ['stt'];
  }
  return caps;
}

// ─── Internal ───

async function _readFromDisk() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      // 兼容旧格式：setup.js 写的 { hardware, profile } 结构
      if (parsed.profile && !parsed.llm && !parsed.modelPool) {
        return deepMerge(DEFAULTS, { ...parsed.profile, _hardware: parsed.hardware });
      }
      const migrated = _migrateOldFormat(parsed);
      return deepMerge(DEFAULTS, migrated);
    }
  } catch { /* file missing or invalid */ }
  return { ...DEFAULTS };
}

async function _writeToDisk(data) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const { _hardware, _profileSource, ...clean } = data;
  const tmp = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(clean, null, 2));
  await fs.rename(tmp, CONFIG_PATH);
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

export { CONFIG_PATH, CAPABILITY_SLOTS };
