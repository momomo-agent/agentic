import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { chat } from './brain.js';
import { getMetrics, startMark, endMark } from '../runtime/profiler.js';
import { detectVoiceActivity } from '../runtime/vad.js';
import * as stt from '../runtime/stt.js';
import * as tts from '../runtime/tts.js';
import { errorHandler } from './middleware.js';
import { getDevices, initWebSocket, startWakeWordDetection, broadcastWakeword, setSessionData, broadcastSession } from './hub.js';
import { getConfig, setConfig, reloadConfig, CONFIG_PATH, getModelPool, addToPool, removeFromPool, getAssignments, setAssignments } from '../config.js';
import { getEngines, discoverModels, getEngine } from '../engine/registry.js';

function getLanIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

const upload = multer({ storage: multer.memoryStorage() });

const logBuffer = [];
const _log = console.log;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
console.log = (...args) => {
  logBuffer.push({ ts: Date.now(), msg: stripAnsi(args.join(' ')) });
  if (logBuffer.length > 200) logBuffer.shift();
  _log(...args);
};

let inflight = 0;
let draining = false;

export function startDrain() { draining = true; }
export function resetDrain() { draining = false; }

export function waitDrain(timeout = 10_000) {
  if (inflight === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('drain timeout')), timeout);
    const check = setInterval(() => {
      if (inflight === 0) { clearInterval(check); clearTimeout(timer); resolve(); }
    }, 50);
  });
}

function getOllamaHost(config) {
  return config?.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
}

async function getOllamaStatus() {
  try {
    const config = await getConfig();
    const host = getOllamaHost(config);
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { running: false, models: [], host, error: `HTTP ${res.status}` };
    const { models } = await res.json();
    return { running: true, models: models.map(m => m.name), host };
  } catch (e) {
    const config = await getConfig().catch(() => ({}));
    const host = getOllamaHost(config);
    return { running: false, models: [], host, error: e.message };
  }
}

function addRoutes(r) {
  r.get('/health', (req, res) => res.json({ status: 'ok' }));

  // ─── OpenAI-compatible API ───────────────────────────────
  r.get('/v1/models', (req, res) => {
    res.json({
      object: 'list',
      data: [{ id: 'agentic-service', object: 'model', created: Date.now(), owned_by: 'local' }],
    });
  });

  r.post('/v1/chat/completions', async (req, res) => {
    const { messages = [], model, stream = false, temperature, max_tokens, tools } = req.body;
    if (!messages.length) return res.status(400).json({ error: { message: 'No messages provided', type: 'invalid_request_error' } });

    const id = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      try {
        for await (const chunk of chat(messages, { tools })) {
          if (chunk.type === 'content') {
            const delta = { role: 'assistant', content: chunk.content ?? chunk.text ?? '' };
            res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: model || 'agentic-service', choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`);
          }
          if (chunk.type === 'tool_use') {
            const delta = { role: 'assistant', tool_calls: [{ index: 0, id: chunk.id, type: 'function', function: { name: chunk.name, arguments: JSON.stringify(chunk.input) } }] };
            res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: model || 'agentic-service', choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`);
          }
        }
        res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: model || 'agentic-service', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
        res.write('data: [DONE]\n\n');
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
      }
      res.end();
    } else {
      try {
        const chunks = [];
        const toolCalls = [];
        for await (const chunk of chat(messages, { tools })) {
          if (chunk.type === 'content') chunks.push(chunk.content ?? chunk.text ?? '');
          if (chunk.type === 'tool_use') {
            toolCalls.push({
              id: chunk.id,
              type: 'function',
              function: { name: chunk.name, arguments: JSON.stringify(chunk.input) }
            });
          }
        }
        const content = chunks.join('');
        const message = { role: 'assistant', content };
        if (toolCalls.length) message.tool_calls = toolCalls;
        res.json({
          id, object: 'chat.completion', created, model: model || 'agentic-service',
          choices: [{ index: 0, message, finish_reason: toolCalls.length ? 'tool_calls' : 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });
      } catch (error) {
        res.status(500).json({ error: { message: error.message, type: 'server_error' } });
      }
    }
  });
  // ─── End OpenAI-compatible API ───────────────────────────

  // ─── Anthropic-compatible API ──────────────────────────────
  r.post('/v1/messages', async (req, res) => {
    const { model, messages = [], system, stream = false, max_tokens = 4096 } = req.body;
    if (!messages.length) return res.status(400).json({ type: 'error', error: { type: 'invalid_request_error', message: 'messages is required' } });

    // Convert Anthropic format to OpenAI-style messages for internal chat()
    const chatMessages = [];
    if (system) {
      const sysText = typeof system === 'string' ? system : system.map(b => b.text).join('\n');
      chatMessages.push({ role: 'system', content: sysText });
    }
    for (const msg of messages) {
      const content = typeof msg.content === 'string'
        ? msg.content
        : msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      chatMessages.push({ role: msg.role, content });
    }

    const msgId = `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const modelName = model || 'agentic-service';

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      try {
        // message_start
        res.write(`event: message_start\ndata: ${JSON.stringify({
          type: 'message_start',
          message: { id: msgId, type: 'message', role: 'assistant', content: [], model: modelName, stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } }
        })}\n\n`);

        // content_block_start
        res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`);

        let outputTokens = 0;
        for await (const chunk of chat(chatMessages)) {
          if (chunk.type === 'content') {
            const text = chunk.content ?? chunk.text ?? '';
            outputTokens += Math.ceil(text.length / 4); // rough estimate
            res.write(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })}\n\n`);
          }
        }

        // content_block_stop
        res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);

        // message_delta
        res.write(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: outputTokens } })}\n\n`);

        // message_stop
        res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      } catch (error) {
        res.write(`event: error\ndata: ${JSON.stringify({ type: 'error', error: { type: 'server_error', message: error.message } })}\n\n`);
      }
      res.end();
    } else {
      try {
        const chunks = [];
        for await (const chunk of chat(chatMessages)) {
          if (chunk.type === 'content') chunks.push(chunk.content ?? chunk.text ?? '');
        }
        const text = chunks.join('');
        res.json({
          id: msgId,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text }],
          model: modelName,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: Math.ceil(text.length / 4) },
        });
      } catch (error) {
        res.status(500).json({ type: 'error', error: { type: 'server_error', message: error.message } });
      }
    }
  });
  // ─── End Anthropic-compatible API ──────────────────────────

  r.post('/api/chat', async (req, res) => {
    const { message, messages: rawMessages, history = [], tools, sessionId } = req.body;
    console.log(`[chat] request: ${message || (rawMessages?.length ? `${rawMessages.length} messages` : 'empty')}`);
    // Support both { message: string } and { messages: [...] } formats
    let chatMessages;
    if (rawMessages?.length) {
      chatMessages = rawMessages;
    } else if (message) {
      chatMessages = [...history, { role: 'user', content: message }];
    } else {
      return res.status(400).json({ error: 'message or messages required' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const assistantChunks = [];
    try {
      for await (const chunk of chat(chatMessages, { tools })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.type === 'content') assistantChunks.push(chunk.content ?? chunk.text);
      }
      res.write('data: [DONE]\n\n');
      if (sessionId) {
        const updatedHistory = [...chatMessages, { role: 'assistant', content: assistantChunks.join('') }];
        setSessionData(sessionId, 'history', updatedHistory);
        broadcastSession(sessionId);
      }
    } catch (error) {
      console.log(`[chat] error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
    res.end();
  });

  r.get('/api/status', async (req, res) => {
    const { detect } = await import('../detector/hardware.js');
    const { getDownloadState } = await import('../cli/download-state.js');
    const hardware = await detect();
    const config = await getConfig();
    const ollama = await getOllamaStatus();
    const download = getDownloadState();
    res.json({ hardware, config, ollama, devices: getDevices(), download });
  });

  r.get('/api/devices', (req, res) => res.json(getDevices()));

  r.get('/api/config', async (req, res) => res.json(await getConfig()));

  r.put('/api/config', async (req, res) => {
    try {
      await setConfig(req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Model Pool & Assignments ─────────────────────────────
  r.get('/api/model-pool', async (req, res) => {
    try {
      res.json(await getModelPool());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post('/api/model-pool', async (req, res) => {
    try {
      const model = req.body;
      if (!model.id || !model.name || !model.provider) {
        return res.status(400).json({ error: 'id, name, provider required' });
      }
      const result = await addToPool(model);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.delete('/api/model-pool/:id', async (req, res) => {
    try {
      await removeFromPool(decodeURIComponent(req.params.id));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.get('/api/assignments', async (req, res) => {
    try {
      res.json(await getAssignments());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.put('/api/assignments', async (req, res) => {
    try {
      const result = await setAssignments(req.body);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post('/api/models/pull', async (req, res) => {
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: 'model required' });
    
    const { setDownloadState, clearDownloadState } = await import('../cli/download-state.js');
    setDownloadState({ inProgress: true, model, status: 'Starting...', progress: 0, total: 0 });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const config = await getConfig();
      const host = getOllamaHost(config);
      const response = await fetch(`${host}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: true })
      });

      if (!response.ok) {
        clearDownloadState();
        res.write(`data: ${JSON.stringify({ error: 'Ollama not running' })}\n\n`);
        return res.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            // Update persistent download state
            if (data.total) {
              setDownloadState({ status: data.status || '', progress: data.completed || 0, total: data.total });
            } else if (data.status) {
              setDownloadState({ status: data.status });
            }
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch {}
        }
      }
      
      clearDownloadState();
      res.write(`data: ${JSON.stringify({ status: 'success' })}\n\n`);
      res.end();
    } catch (e) {
      clearDownloadState();
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  });

  r.delete('/api/models/:name', async (req, res) => {
    const { name } = req.params;
    try {
      const config = await getConfig();
      const host = getOllamaHost(config);
      const response = await fetch(`${host}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error('Delete failed');
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'audio required' });
    if (!detectVoiceActivity(req.file.buffer)) return res.json({ text: '', skipped: true });
    try {
      res.json({ text: await stt.transcribe(req.file.buffer) });
    } catch (e) {
      res.status(e.code === 'EMPTY_AUDIO' ? 400 : 500).json({ error: e.message });
    }
  });

  r.post('/api/synthesize', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    try {
      const audio = await tts.synthesize(text);
      res.set('Content-Type', 'audio/wav').send(audio);
    } catch (e) {
      res.status(e.code === 'EMPTY_TEXT' ? 400 : 500).json({ error: e.message });
    }
  });

  // Alias for /api/synthesize
  r.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    try {
      const audio = await tts.synthesize(text);
      res.set('Content-Type', 'audio/wav').send(audio);
    } catch (e) {
      res.status(e.code === 'EMPTY_TEXT' ? 400 : 500).json({ error: e.message });
    }
  });

  r.post('/api/voice', upload.single('audio'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'audio required' });
    if (!detectVoiceActivity(req.file.buffer)) return res.json({ text: '', skipped: true });

    const t0 = Date.now();
    try {
      startMark('voice-pipeline');
      // STT
      const text = await stt.transcribe(req.file.buffer);

      // LLM
      const messages = [{ role: 'user', content: text }];
      const replyChunks = [];
      for await (const chunk of chat(messages)) {
        if (chunk.type === 'content') replyChunks.push(chunk.text);
      }
      const reply = replyChunks.join('');

      // TTS
      const audio = await tts.synthesize(reply);
      endMark('voice-pipeline');

      const ms = Date.now() - t0;
      console.log(`[voice] latency: ${ms}ms`);
      if (ms > 2000) console.error(`[voice] LATENCY EXCEEDED: ${ms}ms`);

      res.set('Content-Type', 'audio/wav').send(audio);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vision — multimodal image analysis via Ollama
  r.post('/api/vision', async (req, res) => {
    const { image, prompt = 'Describe this image in detail.', fast = false, history = [] } = req.body;
    if (!image) return res.status(400).json({ error: 'image (base64) required' });

    const config = await getConfig();
    const vis = config.vision || {};
    const isCloud = vis.provider === 'cloud' || (vis.provider && vis.provider !== 'ollama');

    // Strip data URI prefix if present (handles image/jpeg, image/png, image/webp, etc.)
    const base64 = image.replace(/^data:[^;]+;base64,/, '');
    console.log(`[vision] model=${fast ? 'gemma4:e4b(fast)' : 'auto'} prompt="${prompt.slice(0,50)}" image=${Math.round(base64.length/1024)}KB`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      if (isCloud) {
        // Cloud vision via OpenAI-compatible API
        const apiKey = vis.apiKey || config.llm?.apiKey || process.env.OPENAI_API_KEY;
        const baseUrl = vis.baseUrl || config.llm?.baseUrl || 'https://api.openai.com/v1';
        const model = vis.model || 'gpt-4o';
        if (!apiKey) throw new Error('Vision API key not configured');

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }
            ] }],
            stream: true
          })
        });

        if (!response.ok) throw new Error(`Cloud vision error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const text = JSON.parse(data).choices?.[0]?.delta?.content;
              if (text) res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`);
            } catch {}
          }
        }
      } else {
        // Local vision via Ollama — resolve model from assignments → pool → config fallback
        const assignments = config.assignments || {};
        const pool = config.modelPool || [];
        let model;
        if (fast) {
          // Fast mode: prefer small vision model for real-time use
          model = 'gemma4:e4b';
        } else if (vis.model) {
          model = vis.model;
        } else if (assignments.vision) {
          const poolEntry = pool.find(m => m.id === assignments.vision);
          model = poolEntry?.name || assignments.vision.replace(/^ollama:/, '');
        } else {
          model = config.llm?.model || 'gemma4:e4b';
        }
        const host = config.ollamaHost || config.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';

        const ollamaBody = {
            model,
            messages: [
              ...history.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: prompt, images: [base64] }
            ],
            stream: true
          };
        if (fast) {
          ollamaBody.think = false;
          ollamaBody.options = { num_predict: 100 };
        }

        const response = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ollamaBody)
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`Ollama vision error: ${response.status} ${errBody}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let inThink = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n').filter(l => l.trim())) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                let text = data.message.content;
                // Filter out <think>...</think> blocks from thinking models
                if (text.includes('<think>')) inThink = true;
                if (inThink) {
                  if (text.includes('</think>')) {
                    text = text.split('</think>').pop();
                    inThink = false;
                    if (!text.trim()) continue;
                  } else {
                    continue;
                  }
                }
                if (text) res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`);
              }
            } catch {}
          }
        }
      }
      res.write('data: [DONE]\n\n');
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    }
    res.end();
  });

  r.get('/api/perf', (_req, res) => res.json(getMetrics()));

  // ─── Engine API (new unified layer) ─────────────────────
  r.get('/api/engines', async (_req, res) => {
    try {
      const engines = getEngines();
      const result = [];
      for (const e of engines) {
        const status = await e.status().catch(() => ({ available: false }));
        result.push({ id: e.id, name: e.name, ...status });
      }
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  r.get('/api/engines/models', async (req, res) => {
    try {
      const models = await discoverModels();
      res.json(models);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  r.get('/api/engines/recommended', async (_req, res) => {
    try {
      const engines = getEngines();
      const all = [];
      for (const e of engines) {
        if (e.recommended) {
          const recs = typeof e.recommended === 'function' ? e.recommended() : [];
          for (const r of recs) {
            all.push({ ...r, engineId: e.id });
          }
        }
      }
      res.json(all);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Proxy Ollama tags API so frontend doesn't need direct Ollama access
  r.get('/api/ollama/tags', async (_req, res) => {
    try {
      const config = await getConfig();
      const host = config.ollamaHost || config.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
      const resp = await fetch(`${host}/api/tags`);
      const data = await resp.json();
      res.json(data);
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  // Proxy Ollama pull (streaming)
  r.post('/api/ollama/pull', async (req, res) => {
    try {
      const config = await getConfig();
      const host = config.ollamaHost || config.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
      const resp = await fetch(`${host}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      res.setHeader('Content-Type', 'application/x-ndjson');
      const reader = resp.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      pump().catch(() => res.end());
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  // Proxy Ollama delete
  r.delete('/api/ollama/delete', async (req, res) => {
    try {
      const config = await getConfig();
      const host = config.ollamaHost || config.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
      const resp = await fetch(`${host}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      if (resp.ok) res.json({ ok: true });
      else res.status(resp.status).json({ error: await resp.text() });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  r.get('/api/logs', (req, res) => res.json(logBuffer.slice(-50)));

  const adminDist = new URL('../../dist/admin', import.meta.url).pathname;
  r.use('/admin', express.static(adminDist, { etag: false, maxAge: 0 }));
  r.get('/admin', (req, res) => { res.set('Cache-Control', 'no-store'); res.sendFile(path.join(adminDist, 'index.html')); });
  
  // Serve examples
  const examplesDir = new URL('../../examples', import.meta.url).pathname;
  r.use('/examples', express.static(examplesDir));

  // Serve packages (for examples that reference agentic-voice.js etc)
  const packagesDir = '/Users/kenefe/LOCAL/momo-agent/projects/agentic/packages';
  r.use('/packages', express.static(packagesDir));
  
  // Serve admin UI at root (exact match first, then static assets)
  r.get('/', (req, res) => { res.set('Cache-Control', 'no-store'); res.sendFile(path.join(adminDist, 'index.html')); });
  r.use(express.static(adminDist, { etag: false, maxAge: 0 }));
}

export function createRouter() {
  const router = express.Router();
  addRoutes(router);
  return router;
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use((req, res, next) => {
    if (draining) return res.status(503).json({ error: 'server draining' });
    inflight++;
    res.on('finish', () => inflight--);
    next();
  });
  addRoutes(app);
  app.use(errorHandler);
  return app;
}

function listenAsync(server, port) {
  return new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', (err) => reject(
      err.code === 'EADDRINUSE' ? new Error(`Port ${port} is already in use`) : err
    ));
    server.listen(port);
  });
}

export async function startServer(port = 3000, { https: useHttps = false } = {}) {
  const app = createApp();

  if (useHttps) {
    let httpsServer;
    try {
      const { createServer } = await import('./httpsServer.js');
      httpsServer = createServer(app);
      await listenAsync(httpsServer, port);
    } catch (err) {
      console.error(`HTTPS setup failed: ${err.message}, falling back to HTTP`);
      const httpFallback = http.createServer(app);
      await listenAsync(httpFallback, port);
      initWebSocket(httpFallback);
      startWakeWordDetection();
      await Promise.all([stt.init(), tts.init()]).catch(e => console.warn('Runtime init warning:', e.message));
      console.log(`Server running at http://localhost:${port}`);
      return httpFallback;
    }

    initWebSocket(httpsServer);
    startWakeWordDetection();
    await Promise.all([stt.init(), tts.init()]).catch(e => console.warn('Runtime init warning:', e.message));

    const lanIp = getLanIp();
    console.log(`Server running at https://localhost:${port}`);
    if (lanIp) console.log(`LAN access: https://${lanIp}:${port}`);

    const HTTP_PORT = 3001;
    const redirectServer = http.createServer((req, res) => {
      const host = (req.headers.host || 'localhost').split(':')[0];
      res.writeHead(301, { Location: `https://${host}:${port}${req.url}` });
      res.end();
    });
    try {
      await listenAsync(redirectServer, HTTP_PORT);
    } catch {
      console.warn(`HTTP redirect port ${HTTP_PORT} in use, skipping redirect`);
    }

    return { http: redirectServer, https: httpsServer };
  }

  const httpServer = http.createServer(app);
  await listenAsync(httpServer, port);
  initWebSocket(httpServer);
  startWakeWordDetection();
  // const stopWake = startWakeWordPipeline(() => broadcastWakeword('server')); // Disabled for basic demos
  process.once('SIGINT', async () => {
    startDrain();
    // stopWake(); // Disabled
    try { await waitDrain(10_000); } catch { /* timeout, proceed */ }
    httpServer.close(() => process.exit(0));
  });
  // Init engines + runtime
  const { initEngines } = await import('../engine/init.js');
  await initEngines().catch(err => console.warn('Engine init warning:', err.message));
  await Promise.all([stt.init(), tts.init()]).catch(err =>
    console.warn('Runtime init warning:', err.message)
  );
  const lanIp = getLanIp();
  console.log(`Server running at http://localhost:${port}`);
  if (lanIp) console.log(`LAN access: http://${lanIp}:${port}`);
  return httpServer;
}

export function stopServer(server) {
  return new Promise((resolve, reject) =>
    server.close(err => err ? reject(err) : resolve())
  );
}
