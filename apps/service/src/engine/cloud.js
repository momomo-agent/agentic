/**
 * Cloud Engine — 云端 API (OpenAI, Anthropic, etc.)
 *
 * 每个 provider 注册为独立的 cloud engine 实例。
 * 一个 API key 可以提供多种能力 (chat, vision, stt, tts, embedding)。
 */

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
      console.log(`[retry] engine=${engineName} attempt=${attempt + 1} reason=${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function createCloudEngine(provider, config) {
  const { apiKey, baseUrl, models: modelList } = config;

  // Default model lists per provider
  const DEFAULT_MODELS = {
    openai: [
      { name: 'gpt-4o', capabilities: ['chat', 'vision'] },
      { name: 'gpt-4o-mini', capabilities: ['chat', 'vision'] },
      { name: 'gpt-4.1-mini', capabilities: ['chat', 'vision'] },
      { name: 'o4-mini', capabilities: ['chat'] },
      { name: 'whisper-1', capabilities: ['stt'] },
      { name: 'tts-1', capabilities: ['tts'] },
      { name: 'text-embedding-3-small', capabilities: ['embedding'] },
    ],
    anthropic: [
      { name: 'claude-sonnet-4-20250514', capabilities: ['chat', 'vision'] },
      { name: 'claude-haiku-3.5', capabilities: ['chat', 'vision'] },
    ],
    google: [
      { name: 'gemini-2.5-flash', capabilities: ['chat', 'vision'] },
      { name: 'gemini-2.5-pro', capabilities: ['chat', 'vision'] },
    ],
    elevenlabs: [
      { name: 'scribe_v2', capabilities: ['stt'] },
      { name: 'eleven_flash_v2_5', capabilities: ['tts'] },
      { name: 'eleven_multilingual_v2', capabilities: ['tts'] },
    ],
  };

  const knownModels = modelList || DEFAULT_MODELS[provider] || [];

  return {
    name: `Cloud (${provider})`,
    provider,
    apiKey,
    baseUrl,

    async status() {
      return { available: !!apiKey, provider };
    },

    async models() {
      if (!apiKey) return [];
      return knownModels.map(m => ({
        id: `${provider}:${m.name}`,
        name: m.name,
        capabilities: m.capabilities || ['chat'],
        installed: true,
        description: m.description || '',
      }));
    },

    recommended() {
      return knownModels;
    },

    /**
     * Run inference via cloud API
     * @param {string} modelName - e.g. "gpt-4o", "whisper-1", "tts-1"
     * @param {object} input - { messages, tools?, stream? } for chat; { audioBuffer } for STT; { text } for TTS/embedding
     */
    async *run(modelName, input) {
      yield* withRetry(
        () => this._runInner(modelName, input),
        {
          maxRetries: 3,
          shouldRetry: (err) => {
            const status = err.httpStatus;
            return status === 429 || (status >= 500 && status < 600);
          },
          getDelay: (err, attempt) => {
            if (err.httpStatus === 429 && err.retryAfter) {
              return err.retryAfter * 1000;
            }
            return 1000 * Math.pow(2, attempt - 1);
          },
          engineName: `cloud:${provider}`,
        }
      );
    },

    async *_runInner(modelName, input) {
      if (!apiKey) throw new Error(`No API key for ${provider}`);
      const base = baseUrl || (provider === 'anthropic' ? 'https://api.anthropic.com' : provider === 'elevenlabs' ? 'https://api.elevenlabs.io' : 'https://api.openai.com');

      // STT (e.g. whisper-1, scribe_v2)
      if (input.audioBuffer) {
        if (provider === 'elevenlabs') {
          const form = new FormData();
          form.append('file', new Blob([input.audioBuffer], { type: 'audio/wav' }), 'audio.wav');
          form.append('model_id', modelName);
          const res = await fetch(`${base}/v1/speech-to-text`, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey },
            body: form,
          });
          if (!res.ok) {
            const err = new Error(`ElevenLabs STT error: ${res.status}`);
            err.httpStatus = res.status;
            throw err;
          }
          const data = await res.json();
          yield { type: 'transcription', text: data.text || '' };
          return;
        }
        const form = new FormData();
        form.append('file', new Blob([input.audioBuffer], { type: 'audio/wav' }), 'audio.wav');
        form.append('model', modelName);
        const res = await fetch(`${base}/v1/audio/transcriptions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: form,
        });
        if (!res.ok) {
          const err = new Error(`Cloud STT error: ${res.status}`);
          err.httpStatus = res.status;
          const retryAfter = res.headers.get('Retry-After');
          if (retryAfter) err.retryAfter = parseInt(retryAfter, 10);
          throw err;
        }
        const data = await res.json();
        yield { type: 'transcription', text: data.text };
        return;
      }

      // TTS (e.g. tts-1, eleven_flash_v2_5)
      if (input.ttsText !== undefined) {
        if (provider === 'elevenlabs') {
          const voiceId = input.voice || 'JBFqnCBsd6RMkjVDRZzb'; // default: George
          const res = await fetch(`${base}/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: input.ttsText,
              model_id: modelName,
              voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
            }),
          });
          if (!res.ok) {
            const err = new Error(`ElevenLabs TTS error: ${res.status}`);
            err.httpStatus = res.status;
            throw err;
          }
          const buf = Buffer.from(await res.arrayBuffer());
          yield { type: 'audio', data: buf };
          return;
        }
        const res = await fetch(`${base}/v1/audio/speech`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName, input: input.ttsText, voice: input.voice || 'alloy' }),
        });
        if (!res.ok) {
          const err = new Error(`Cloud TTS error: ${res.status}`);
          err.httpStatus = res.status;
          const retryAfter = res.headers.get('Retry-After');
          if (retryAfter) err.retryAfter = parseInt(retryAfter, 10);
          throw err;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        yield { type: 'audio', data: buf };
        return;
      }

      // Embedding
      if (input.text !== undefined && !input.messages) {
        const res = await fetch(`${base}/v1/embeddings`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName, input: input.text }),
        });
        if (!res.ok) {
          const err = new Error(`Cloud embed error: ${res.status}`);
          err.httpStatus = res.status;
          const retryAfter = res.headers.get('Retry-After');
          if (retryAfter) err.retryAfter = parseInt(retryAfter, 10);
          throw err;
        }
        const data = await res.json();
        yield { type: 'embedding', data: data.data?.[0]?.embedding };
        return;
      }

      // Chat (streaming SSE)
      const chatBody = { model: modelName, messages: input.messages, stream: true };
      if (input.tools?.length) chatBody.tools = input.tools;

      const headers = { 'Content-Type': 'application/json' };
      let url = `${base}/v1/chat/completions`;
      if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        url = `${base}/v1/messages`;
        chatBody.max_tokens = chatBody.max_tokens || 4096;
        delete chatBody.stream;
        chatBody.stream = true;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(chatBody),
      });
      if (!res.ok) {
        const err = new Error(`Cloud chat error: ${res.status}`);
        err.httpStatus = res.status;
        const retryAfter = res.headers.get('Retry-After');
        if (retryAfter) err.retryAfter = parseInt(retryAfter, 10);
        throw err;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { yield { type: 'done' }; return; }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) yield { type: 'content', text: delta.content };
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) {
                  const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
                  yield { type: 'tool_use', name: tc.function.name, input: args, text: JSON.stringify(args) };
                }
              }
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
      yield { type: 'done' };
    },
  };
}
