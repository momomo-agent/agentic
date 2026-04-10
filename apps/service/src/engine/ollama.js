/**
 * Ollama Engine — chat, vision, embedding
 */

import { getConfig } from '../config.js';

function getHost(config) {
  return config?.ollamaHost || config?.ollama?.host || process.env.OLLAMA_HOST || 'http://localhost:11434';
}

// Known capability hints by model name patterns
const CAP_HINTS = [
  { pattern: /^(gemma4|llava|moondream|bakllava)/i, caps: ['chat', 'vision'] },
  { pattern: /^(nomic-embed|mxbai-embed|bge-|snowflake-arctic-embed|all-minilm)/i, caps: ['embedding'] },
  { pattern: /embed/i, caps: ['embedding'] },
];

function guessCapabilities(name) {
  for (const { pattern, caps } of CAP_HINTS) {
    if (pattern.test(name)) return caps;
  }
  return ['chat'];
}

export default {
  name: 'Ollama',

  async status() {
    try {
      const config = await getConfig();
      const host = getHost(config);
      const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
      return { available: true, host };
    } catch (e) {
      return { available: false, error: e.message };
    }
  },

  async models() {
    const config = await getConfig();
    const host = getHost(config);
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const { models } = await res.json();
    return (models || []).map(m => ({
      id: m.name,
      name: m.name,
      capabilities: guessCapabilities(m.name),
      size: m.size,
      installed: true,
    }));
  },

  /** Pull (download) a model */
  async pull(modelName) {
    const config = await getConfig();
    const host = getHost(config);
    const res = await fetch(`${host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });
    return res;
  },

  /** Delete a model */
  async delete(modelName) {
    const config = await getConfig();
    const host = getHost(config);
    const res = await fetch(`${host}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });
    return res.ok;
  },

  /** Recommended models for discovery UI */
  recommended() {
    return [
      { name: 'gemma4:e4b', description: 'Google Gemma 4 — 高效多模态', size: '~5 GB', capabilities: ['chat', 'vision'] },
      { name: 'gemma3:4b', description: 'Google Gemma 3 — 轻量快速', size: '~3 GB', capabilities: ['chat'] },
      { name: 'llama3.2:3b', description: 'Meta Llama 3.2 — 均衡之选', size: '~2 GB', capabilities: ['chat'] },
      { name: 'qwen2.5:3b', description: '通义千问 2.5 — 中文优化', size: '~2 GB', capabilities: ['chat'] },
      { name: 'phi3:mini', description: 'Microsoft Phi-3 — 超轻量', size: '~2.3 GB', capabilities: ['chat'] },
      { name: 'llava:7b', description: 'LLaVA — 图像问答', size: '~4.7 GB', capabilities: ['chat', 'vision'] },
      { name: 'moondream:latest', description: 'Moondream — 轻量视觉', size: '~1.7 GB', capabilities: ['chat', 'vision'] },
      { name: 'qwen2.5-coder:3b', description: '通义千问 Coder — 代码生成', size: '~2 GB', capabilities: ['chat'] },
      { name: 'nomic-embed-text', description: 'Nomic — 高质量文本嵌入', size: '~274 MB', capabilities: ['embedding'] },
      { name: 'mxbai-embed-large', description: 'MixedBread — 大型嵌入模型', size: '~670 MB', capabilities: ['embedding'] },
      { name: 'bge-m3', description: 'BAAI BGE-M3 — 多语言嵌入', size: '~1.2 GB', capabilities: ['embedding'] },
    ];
  },
};
