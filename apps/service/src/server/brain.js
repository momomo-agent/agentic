import { chat as llmChat } from '../runtime/llm.js';
import { getSession, broadcastSession } from './hub.js';
import { startMark, endMark } from '../runtime/profiler.js';

const tools = new Map();

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
  // Try Ollama with tools via native API
  const config = { llm: { provider: 'ollama', model: 'gemma4:e4b' } };
  try {
    const body = { model: config.llm.model, messages: normalized, stream: true };
    if (tools?.length) body.tools = tools;

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);

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
    return;
  } catch (err) {
    if (tools?.length) {
      // Ollama doesn't support tools — fall through to cloud
      console.warn('Ollama tool_use unsupported, falling back to cloud:', err.message);
    } else {
      throw err;
    }
  }

  // Cloud fallback with tools (OpenAI)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const body = { model: 'gpt-4o-mini', messages: normalized, stream: true };
  if (tools?.length) body.tools = tools.map(t => ({ type: 'function', function: t }));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

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
  // Accept both string (legacy) and messages array
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
