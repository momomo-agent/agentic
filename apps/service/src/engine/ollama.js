/**
 * Ollama Engine — chat, vision, embedding
 */

import { getConfig } from '../config.js';

async function* withRetry(fn, { maxRetries, shouldRetry, getDelay, engineName }) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      yield* fn();
      return;
    } catch (err) {
      lastError = err;
      if (attempt > maxRetries || !shouldRetry(err)) throw err;
      const delay = getDelay(err, attempt);
      const reason = /aborted/i.test(err.message) ? 'model loading timeout, retrying...' : err.message;
      console.log(`[ollama] ${engineName} attempt ${attempt + 1}/${maxRetries + 1}: ${reason}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

function getHost(config) {
  return config?.ollamaHost || config?.ollama?.host || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
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

  /**
   * Run chat/embedding inference via Ollama HTTP API
   * @param {string} modelName - e.g. "gemma4:e4b"
   * @param {object} input - { messages, stream?, tools? } for chat; { text } for embedding
   * @returns {AsyncGenerator} streaming chunks for chat, embedding result for embedding
   */
  async *run(modelName, input) {
    yield* withRetry(
      () => this._runInner(modelName, input),
      {
        maxRetries: 1,
        shouldRetry: (err) => {
          return err.name === 'AbortError'
            || err.name === 'TypeError'
            || err.message?.includes('ECONNREFUSED');
        },
        getDelay: () => 1000,
        engineName: 'ollama',
      }
    );
  },

  async *_runInner(modelName, input) {
    const config = await getConfig();
    const host = getHost(config);

    if (input.text !== undefined) {
      const res = await fetch(`${host}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, input: input.text }),
      });
      if (!res.ok) throw new Error(`Ollama embed error: ${res.status}`);
      const data = await res.json();
      yield { type: 'embedding', data: data.embeddings?.[0] };
      return;
    }

    // Chat mode (streaming)
    // Convert OpenAI-style multimodal content to Ollama format
    const ollamaMessages = (input.messages || []).map(msg => {
      if (typeof msg.content === 'string') return msg;
      if (!Array.isArray(msg.content)) return msg;
      // Extract text and images from content blocks
      let text = '';
      const images = [];
      for (const block of msg.content) {
        if (block.type === 'text') text += block.text;
        else if (block.type === 'image_url') {
          const url = typeof block.image_url === 'string' ? block.image_url : block.image_url?.url;
          if (url?.startsWith('data:')) {
            // Extract base64 from data URI
            const b64 = url.split(',')[1];
            if (b64) images.push(b64);
          }
        }
      }
      const out = { role: msg.role, content: text };
      if (images.length) out.images = images;
      return out;
    });

    // Disable thinking by default (configurable via config.ollama.thinking)
    const thinking = config?.ollama?.thinking ?? false;

    // Append /no_think for qwen3-style models that use prompt-based control
    if (!thinking) {
      const lastUser = [...ollamaMessages].reverse().find(m => m.role === 'user');
      if (lastUser && typeof lastUser.content === 'string' && !lastUser.content.includes('/no_think')) {
        lastUser.content += ' /no_think';
      }
    }

    const body = {
      model: modelName,
      messages: ollamaMessages,
      stream: true,
      think: thinking,  // Ollama native think param (gemma4, etc.)
    };
    if (input.tools?.length) {
      body.tools = input.tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description || '', parameters: t.parameters || {} },
      }));
      console.log(`[ollama] Sending ${body.tools.length} tools to ${modelName}: ${body.tools.map(t => t.function.name).join(', ')}`);
    } else {
      console.log(`[ollama] No tools for ${modelName}`);
    }

    const controller = new AbortController();
    const hasImages = ollamaMessages.some(m => m.images?.length);
    // First-token timeout: model cold-start can take 15-30s (loading weights into memory)
    const timeout = setTimeout(() => controller.abort(), hasImages ? 120000 : 60000);

    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      clearTimeout(timeout);
      throw new Error(`Ollama chat error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let gotFirstToken = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const json = JSON.parse(line);
          if (!gotFirstToken) {
            gotFirstToken = true;
            clearTimeout(timeout);
          }
          if (json.message?.tool_calls?.length) {
            console.log(`[ollama] Model returned ${json.message.tool_calls.length} tool_calls: ${json.message.tool_calls.map(tc => tc.function?.name).join(', ')}`);
            for (const tc of json.message.tool_calls) {
              const args = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments) : tc.function.arguments;
              yield { type: 'tool_use', name: tc.function.name, input: args, text: JSON.stringify(args) };
            }
          }
          if (json.message?.content) {
            yield { type: 'content', text: json.message.content };
          }
          if (json.done) {
            yield { type: 'done' };
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  },
};
