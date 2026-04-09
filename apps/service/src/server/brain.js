import { getConfig, onConfigChange } from '../config.js';
import { getSession, broadcastSession } from './hub.js';
import { startMark, endMark } from '../runtime/profiler.js';

const tools = new Map();
let _config = null;

// 启动时加载 + 监听变更
async function ensureConfig() {
  if (!_config) _config = await getConfig();
  return _config;
}
onConfigChange(c => { _config = c; console.log('[brain] config reloaded:', c.llm?.model); });

export function registerTool(name, fn) {
  tools.set(name, fn);
}

function normalizeMessages(messages) {
  return messages.map(msg => {
    if (msg.role === 'tool' && msg.tool_use_id) {
      return { role: 'user', content: [{ type: 'tool_result', tool_use_id: msg.tool_use_id, content: String(msg.content) }] };
    }
    return msg;
  });
}

async function* chatWithTools(messages, tools) {
  const normalized = normalizeMessages(messages);
  const config = await ensureConfig();
  try {
    if (config.llm.provider === 'ollama') {
      yield* ollamaChat(normalized, tools, config);
      return;
    }
    yield* cloudChat(normalized, tools, config.llm);
    return;
  } catch (err) {
    if (config.fallback?.provider) {
      console.warn(`Primary LLM failed (${err.message}), trying fallback...`);
      yield* cloudChat(normalized, tools, config.fallback);
      return;
    }
    throw err;
  }
}

async function* ollamaChat(messages, tools, config) {
  const model = config.llm.model;
  const ollamaHost = config.llm.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
  console.log(`[brain] ollama request: model=${model} host=${ollamaHost}`);

  const body = { model, messages, stream: true };
  if (tools?.length) body.tools = tools;

  const response = await fetch(`${ollamaHost}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) throw new Error(`Ollama API error: ${response.status} (model=${model})`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(l => l.trim())) {
      try {
        const data = JSON.parse(line);
        if (data.message?.tool_calls?.length) {
          for (const tc of data.message.tool_calls) {
            yield { type: 'tool_use', id: tc.id || `call_${Date.now()}`, name: tc.function.name, input: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments, text: '' };
          }
        } else if (data.message?.content) {
          yield { type: 'content', text: data.message.content, done: data.done || false };
        }
      } catch { /* ignore */ }
    }
  }
}

async function* cloudChat(messages, tools, providerConfig) {
  const apiKey = providerConfig.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`API key not set for ${providerConfig.provider || 'cloud'} — configure in Admin > Config`);

  const baseUrl = providerConfig.baseUrl || 'https://api.openai.com/v1';
  const model = providerConfig.model || 'gpt-4o-mini';

  const body = { model, messages, stream: true };
  if (tools?.length) body.tools = tools.map(t => ({ type: 'function', function: t }));

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Cloud LLM API error: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const toolCalls = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        for (const tc of Object.values(toolCalls)) {
          yield { type: 'tool_use', id: tc.id, name: tc.name, input: JSON.parse(tc.args || '{}'), text: '' };
        }
        return;
      }
      try {
        const delta = JSON.parse(data).choices[0]?.delta;
        if (delta?.content) yield { type: 'content', text: delta.content, done: false };
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCalls[idx]) toolCalls[idx] = { id: tc.id, name: tc.function?.name, args: '' };
            if (tc.function?.name) toolCalls[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
          }
        }
      } catch { /* ignore */ }
    }
  }
}

export async function* chat(input, options = {}) {
  const messages = typeof input === 'string'
    ? [...(options.history || []), { role: 'user', content: input }]
    : input;
  const registeredTools = [...tools.entries()].map(([name, fn]) => ({ name, fn }));
  const mergedTools = [...(options.tools || []), ...registeredTools];
  startMark('llm');
  try {
    yield* chatWithTools(messages, mergedTools);
  } catch (err) {
    yield { type: 'error', error: err.message };
  }
  chat._lastMs = endMark('llm');
}

export async function chatSession(sessionId, userMessage, options = {}) {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const messages = [
    { role: 'system', content: session.brainState.systemPrompt },
    ...session.history.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const chunks = [];
  for await (const chunk of chat(messages, options)) {
    if (chunk.type === 'content') chunks.push(chunk.text);
  }
  const response = chunks.join('');

  broadcastSession(sessionId, { role: 'user', content: userMessage, deviceId: options.deviceId });
  broadcastSession(sessionId, { role: 'assistant', content: response, deviceId: 'brain' });

  return response;
}
