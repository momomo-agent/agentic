/**
 * 统一配置中心 — 唯一真相源
 *
 * 配置优先级：
 * 1. config.json（用户配置，最高优先）
 * 2. profile 匹配（硬件检测 → 推荐配置）
 * 3. 内置默认值（兜底）
 *
 * 数据流：
 * - setup 时：硬件检测 → profile 匹配 → 写入 config.json
 * - 运行时：读 config.json → 合并默认值 → 暴露给所有模块
 * - 用户改配置：仪表盘 → writeConfig() → 通知所有监听者
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.agentic-service');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  llm: { provider: 'ollama', model: 'gemma2:2b', ollamaHost: 'http://localhost:11434' },
  stt: { provider: 'whisper' },
  tts: { provider: 'kokoro', voice: 'default' },
  fallback: { provider: '' },
};

let _cache = null;
const _listeners = new Set();

/**
 * 读取当前配置（带缓存）
 * @returns {Promise<Config>}
 */
export async function getConfig() {
  if (_cache) return _cache;
  _cache = await _readFromDisk();
  return _cache;
}

/**
 * 写入配置并通知所有监听者
 * @param {Partial<Config>} updates - 要更新的字段（深合并）
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
 * 不覆盖用户已有配置
 * @param {object} profile - getProfile(hardware) 的结果
 * @param {object} hardware - 硬件信息
 */
export async function initFromProfile(profile, hardware) {
  let existing = null;
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    existing = JSON.parse(raw);
  } catch { /* no existing config */ }

  // 用户已有配置 → 只补缺失字段，不覆盖
  const config = existing
    ? deepMerge(deepMerge(DEFAULTS, profile), existing)
    : deepMerge(DEFAULTS, profile);

  config._hardware = hardware;
  config._profileSource = 'auto';

  await _writeToDisk(config);
  _cache = config;
}

/**
 * 监听配置变更
 * @param {function} fn - 回调 (newConfig) => void
 * @returns {function} unsubscribe
 */
export function onConfigChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * 强制刷新缓存（从磁盘重读）
 */
export async function reloadConfig() {
  _cache = await _readFromDisk();
  for (const fn of _listeners) {
    try { fn(_cache); } catch (e) { console.warn('[config] listener error:', e.message); }
  }
  return _cache;
}

// --- 内部 ---

async function _readFromDisk() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      // 兼容旧格式：setup.js 写的 { hardware, profile } 结构
      if (parsed.profile && !parsed.llm) {
        return deepMerge(DEFAULTS, { ...parsed.profile, _hardware: parsed.hardware });
      }
      return deepMerge(DEFAULTS, parsed);
    }
  } catch { /* file missing or invalid */ }
  return { ...DEFAULTS };
}

async function _writeToDisk(data) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  // 不写 _hardware 等内部字段到磁盘
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

export { CONFIG_PATH };
