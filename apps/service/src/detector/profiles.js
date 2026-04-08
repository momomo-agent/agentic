import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { matchProfile } from './matcher.js';

const PROFILES_URL = process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momomo-agent/agentic-service/main/profiles/default.json';
const CACHE_DIR = path.join(os.homedir(), '.agentic-service');
const CACHE_FILE = path.join(CACHE_DIR, 'profiles.json');
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天

/**
 * 获取配置推荐
 * @param {HardwareInfo} hardware - 硬件信息
 * @returns {Promise<ProfileConfig>}
 */
export async function getProfile(hardware) {
  const profiles = await loadProfiles();
  return matchProfile(profiles, hardware);
}

/**
 * 加载 profiles（远程 + 缓存 + 内置）
 * @returns {Promise<ProfilesData>}
 */
async function loadProfiles() {
  // 1. 尝试从缓存加载
  const cached = await loadCache();
  if (cached && !isCacheExpired(cached.timestamp)) {
    return cached.data;
  }

  // 2. 尝试从远程拉取
  try {
    const remote = await fetchRemoteProfiles();
    await saveCache(remote);
    return remote;
  } catch (error) {
    console.warn('Failed to fetch remote profiles:', error.message);
  }

  // 3. 使用缓存（即使过期）
  if (cached) {
    console.warn('Using expired cache');
    return cached.data;
  }

  // 4. 使用内置默认配置
  console.warn('Using built-in default profiles');
  return await loadBuiltinProfiles();
}

/**
 * 从远程拉取 profiles
 * @returns {Promise<ProfilesData>}
 */
async function fetchRemoteProfiles() {
  console.log('Profiles URL:', PROFILES_URL);
  const response = await fetch(PROFILES_URL, {
    signal: AbortSignal.timeout(5000),
    headers: { 'User-Agent': 'agentic-service' }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * 加载缓存
 * @returns {Promise<{data: ProfilesData, timestamp: number} | null>}
 */
async function loadCache() {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 保存缓存
 * @param {ProfilesData} data
 */
async function saveCache(data) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const cache = {
    data,
    timestamp: Date.now()
  };
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * 检查缓存是否过期
 * @param {number} timestamp
 * @returns {boolean}
 */
function isCacheExpired(timestamp) {
  return Date.now() - timestamp > CACHE_MAX_AGE;
}

/**
 * 加载内置默认配置
 * @returns {Promise<ProfilesData>}
 */
async function loadBuiltinProfiles() {
  try {
    const builtinPath = new URL('../../profiles/default.json', import.meta.url);
    const content = await fs.readFile(builtinPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { version: '0', profiles: [] };
  }
}

/**
 * @typedef {Object} ProfilesData
 * @property {string} version
 * @property {ProfileEntry[]} profiles
 */

/**
 * @typedef {Object} ProfileEntry
 * @property {MatchCriteria} match
 * @property {ProfileConfig} config
 */

/**
 * @typedef {Object} MatchCriteria
 * @property {string} [platform]
 * @property {string} [arch]
 * @property {string} [gpu]
 * @property {number} [minMemory]
 */

/**
 * @typedef {Object} ProfileConfig
 * @property {LLMConfig} llm
 * @property {STTConfig} stt
 * @property {TTSConfig} tts
 * @property {FallbackConfig} fallback
 */

export function watchProfiles(hardware, onReload, interval = 30_000) {
  let lastEtag = null
  const timer = setInterval(async () => {
    try {
      const res = await fetch(PROFILES_URL, {
        signal: AbortSignal.timeout(5000),
        headers: { ...(lastEtag && { 'If-None-Match': lastEtag }) }
      })
      if (res.status === 304) return
      if (!res.ok) return
      lastEtag = res.headers.get('etag')
      const data = await res.json()
      await saveCache(data)
      onReload(matchProfile(data, hardware))
    } catch { /* network error, skip */ }
  }, interval)
  return () => clearInterval(timer)
}

/**
 * @typedef {Object} HardwareInfo
 * @property {string} platform
 * @property {string} arch
 * @property {Object} gpu
 * @property {string} gpu.type
 * @property {number} memory
 */
