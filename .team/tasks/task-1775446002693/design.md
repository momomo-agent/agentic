# Task: 远程 profiles - Technical Design

## 目标
从 CDN 拉取硬件配置推荐表，本地缓存，支持离线

## 文件结构
```
src/detector/
├── profiles.js       # 主入口，导出 getProfile()
└── matcher.js        # 配置匹配逻辑
profiles/
└── default.json      # 内置默认配置
```

## 核心接口

### src/detector/profiles.js
```javascript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const PROFILES_URL = 'https://cdn.jsdelivr.net/gh/momomo-ai/agentic-service@main/profiles/default.json';
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
  const response = await fetch(PROFILES_URL, {
    timeout: 5000,
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
  const builtinPath = new URL('../../profiles/default.json', import.meta.url);
  const content = await fs.readFile(builtinPath, 'utf-8');
  return JSON.parse(content);
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
```

### src/detector/matcher.js
```javascript
/**
 * 匹配最优配置
 * @param {ProfilesData} profiles
 * @param {HardwareInfo} hardware
 * @returns {ProfileConfig}
 */
export function matchProfile(profiles, hardware) {
  // 按优先级排序：精确匹配 > 部分匹配 > 默认
  const candidates = profiles.profiles
    .map(entry => ({
      entry,
      score: calculateMatchScore(entry.match, hardware)
    }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    throw new Error('No matching profile found');
  }

  return candidates[0].entry.config;
}

/**
 * 计算匹配分数
 * @param {MatchCriteria} criteria
 * @param {HardwareInfo} hardware
 * @returns {number} 0-100
 */
function calculateMatchScore(criteria, hardware) {
  let score = 0;
  let maxScore = 0;

  // platform 匹配（权重 30）
  if (criteria.platform !== undefined) {
    maxScore += 30;
    if (criteria.platform === hardware.platform) {
      score += 30;
    } else {
      return 0; // platform 不匹配直接淘汰
    }
  }

  // arch 匹配（权重 20）
  if (criteria.arch !== undefined) {
    maxScore += 20;
    if (criteria.arch === hardware.arch) {
      score += 20;
    }
  }

  // gpu 匹配（权重 30）
  if (criteria.gpu !== undefined) {
    maxScore += 30;
    if (criteria.gpu === hardware.gpu.type) {
      score += 30;
    }
  }

  // minMemory 匹配（权重 20）
  if (criteria.minMemory !== undefined) {
    maxScore += 20;
    if (hardware.memory >= criteria.minMemory) {
      score += 20;
    } else {
      return 0; // 内存不足直接淘汰
    }
  }

  // 归一化到 0-100
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}
```

## profiles/default.json 格式
```json
{
  "version": "1.0.0",
  "profiles": [
    {
      "match": {
        "platform": "darwin",
        "arch": "arm64",
        "gpu": "apple-silicon",
        "minMemory": 16
      },
      "config": {
        "llm": {
          "provider": "ollama",
          "model": "gemma4:26b",
          "quantization": "q8"
        },
        "stt": {
          "provider": "sensevoice",
          "model": "small"
        },
        "tts": {
          "provider": "kokoro",
          "voice": "default"
        },
        "fallback": {
          "provider": "openai",
          "model": "gpt-4o-mini"
        }
      }
    },
    {
      "match": {
        "platform": "linux",
        "gpu": "nvidia",
        "minMemory": 8
      },
      "config": {
        "llm": {
          "provider": "ollama",
          "model": "gemma4:13b",
          "quantization": "q4"
        },
        "stt": {
          "provider": "sensevoice",
          "model": "small"
        },
        "tts": {
          "provider": "kokoro",
          "voice": "default"
        },
        "fallback": {
          "provider": "openai",
          "model": "gpt-4o-mini"
        }
      }
    },
    {
      "match": {},
      "config": {
        "llm": {
          "provider": "openai",
          "model": "gpt-4o-mini"
        },
        "stt": {
          "provider": "openai",
          "model": "whisper-1"
        },
        "tts": {
          "provider": "openai",
          "voice": "alloy"
        },
        "fallback": null
      }
    }
  ]
}
```

## 依赖
```json
{
  "dependencies": {
    "node-fetch": "^3.3.2"
  }
}
```

## 错误处理
- 网络超时（5s）→ 使用缓存或内置配置
- JSON 解析失败 → 使用缓存或内置配置
- 无匹配配置 → 抛出错误（应该不会发生，因为有默认配置）

## 测试用例

### 单元测试 (test/detector/profiles.test.js)
```javascript
import { describe, it, expect, vi } from 'vitest';
import { getProfile } from '../../src/detector/profiles.js';
import { matchProfile } from '../../src/detector/matcher.js';

describe('profiles.getProfile()', () => {
  it('should match Apple Silicon profile', async () => {
    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 16,
      cpu: { cores: 10, model: 'Apple M4' }
    };

    const profile = await getProfile(hardware);
    expect(profile.llm.provider).toBe('ollama');
    expect(profile.llm.model).toBe('gemma4:26b');
  });

  it('should fallback to default when no match', async () => {
    const hardware = {
      platform: 'win32',
      arch: 'x64',
      gpu: { type: 'none', vram: 0 },
      memory: 4,
      cpu: { cores: 4, model: 'Intel' }
    };

    const profile = await getProfile(hardware);
    expect(profile.llm.provider).toBe('openai');
  });
});

describe('matcher.matchProfile()', () => {
  it('should calculate correct match score', () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { platform: 'darwin', arch: 'arm64', gpu: 'apple-silicon' },
          config: { llm: { provider: 'ollama' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' }
    };

    const result = matchProfile(profiles, hardware);
    expect(result.llm.provider).toBe('ollama');
  });
});
```

## 性能要求
- 远程拉取超时 5s
- 缓存读写 < 100ms
- 匹配计算 < 10ms
