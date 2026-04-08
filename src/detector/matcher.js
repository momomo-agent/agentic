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
    if (criteria.gpu === hardware.gpu?.type) {
      score += 30;
    } else {
      return 0; // gpu 类型不匹配直接淘汰
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
  // 空匹配条件（默认配置）返回 1 分，作为兜底
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 1;
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

/**
 * @typedef {Object} HardwareInfo
 * @property {string} platform
 * @property {string} arch
 * @property {Object} gpu
 * @property {string} gpu.type
 * @property {number} memory
 */
