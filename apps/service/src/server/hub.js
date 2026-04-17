import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { chat as brainChat } from './core-bridge.js';
import * as stt from '../runtime/stt.js';
import * as tts from '../runtime/tts.js';
import { detectVoiceActivity } from '../runtime/vad.js';
import { getConfig, setConfig, getAssignments, setAssignments, addToPool, removeFromPool } from '../config.js';
import { getEngines, discoverModels, modelsForCapability, resolveModel } from '../engine/registry.js';
import { getAllHealth } from '../engine/health.js';
import { embed } from '../runtime/embed.js';
import { getMetrics } from '../runtime/profiler.js';
import { getQueueStats } from './queue.js';

const SENTENCE_END_RE = /[.!?]+\s+/;

const registry = new Map(); // id → { ws, name, capabilities, lastPong }
const pendingCaptures = new Map(); // requestId → { resolve, reject, timer }

function isSilent(buffer) {
  if (!buffer || buffer.byteLength === 0) return true;
  const floats = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  const rms = Math.sqrt(floats.reduce((s, v) => s + v * v, 0) / floats.length);
  return rms < 0.01;
}

export async function init() {
  // Sense/wakeword detection disabled for basic demos
  // const emitter = await sense.startHeadless();
  // emitter.on('wakeword', async () => { ... });
  // emitter.on('audio', (chunk) => { ... });
}

// Device management: id → { id, meta, registeredAt, lastSeen, status }
const devices = new Map()

setInterval(() => {
  const now = Date.now()
  for (const d of devices.values()) {
    d.status = (now - d.lastSeen > 60000) ? 'offline' : 'online'
  }
}, 10000)

export function registerDevice(idOrDevice, meta) {
  if (typeof idOrDevice === 'object') {
    const device = idOrDevice
    registry.set(device.id, device)
    devices.set(device.id, { id: device.id, name: device.name, meta: { name: device.name, capabilities: device.capabilities }, registeredAt: devices.get(device.id)?.registeredAt ?? new Date().toISOString(), lastSeen: Date.now(), status: 'online' })
    return
  }
  const id = idOrDevice
  const now = new Date().toISOString()
  devices.set(id, { id, meta, registeredAt: now, lastSeen: Date.now(), status: 'online' })
  return { id, registeredAt: now }
}

export function updateStatus(id, status) {
  if (!devices.has(id)) throw new Error('Device not found: ' + id);
  devices.get(id).status = status;
}

export function heartbeat(id) {
  if (!devices.has(id)) registerDevice(id, {})
  const d = devices.get(id)
  d.lastSeen = Date.now()
  d.status = 'online'
}

export function getDevices() {
  return Array.from(devices.values()).map(d => ({ ...d }))
}

export function unregisterDevice(id) {
  registry.delete(id);
  devices.delete(id);
  for (const [reqId, pending] of pendingCaptures) {
    if (pending.deviceId === id) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Device disconnected'));
      pendingCaptures.delete(reqId);
    }
  }
}

export function sendCommand(deviceId, command) {
  const device = registry.get(deviceId);
  if (!device) throw new Error(`Device not found: ${deviceId}`);
  const SUPPORTED = ['capture', 'speak', 'display'];
  if (!SUPPORTED.includes(command.type)) throw new Error(`Unsupported command type: ${command.type}`);
  const requestId = randomUUID();
  const { type, ...rest } = command;
  device.ws.send(JSON.stringify({ type: 'command', requestId, action: type, ...rest }));
  if (type !== 'capture') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCaptures.delete(requestId);
      reject(new Error('Capture timeout'));
    }, 10000);
    pendingCaptures.set(requestId, { resolve, reject, timer, deviceId });
  });
}

export function broadcastWakeword(deviceId) {
  for (const device of registry.values()) {
    try { device.ws.send(JSON.stringify({ type: 'wakeword', deviceId })); } catch { /* ignore */ }
  }
}

async function handleChat(ws, msg) {
  const { messages, history = [], text, options = {}, tools, _reqId } = msg;
  const chatMessages = messages || [...history, { role: 'user', content: text }];
  const mergedOptions = tools ? { ...options, tools } : options;

  ws.send(JSON.stringify({ type: 'chat_start', _reqId }));
  console.log(`[hub] chat reqId=${_reqId} tools=${tools?.length || 0} messages=${chatMessages.length}`);

  const chunks = [];
  for await (const chunk of brainChat(chatMessages, mergedOptions)) {
    if (chunk.type === 'text_delta') {
      chunks.push(chunk.text);
      ws.send(JSON.stringify({ type: 'chat_delta', text: chunk.text, _reqId }));
    } else if (chunk.type === 'tool_use') {
      ws.send(JSON.stringify({ type: 'tool_use', id: chunk.id, name: chunk.name, input: chunk.input, _reqId }));
    } else if (chunk.type === 'tool_progress') {
      ws.send(JSON.stringify({ type: 'tool_progress', id: chunk.id, name: chunk.name, delta: chunk.delta, _reqId }));
    } else if (chunk.type === 'tool_result') {
      ws.send(JSON.stringify({ type: 'tool_result', id: chunk.id, name: chunk.name, output: chunk.output, _reqId }));
    } else if (chunk.type === 'tool_error') {
      ws.send(JSON.stringify({ type: 'tool_error', id: chunk.id, name: chunk.name, error: chunk.error, _reqId }));
    } else if (chunk.type === 'error') {
      ws.send(JSON.stringify({ type: 'chat_error', error: chunk.error, _reqId }));
    }
  }

  ws.send(JSON.stringify({ type: 'chat_end', text: chunks.join(''), _reqId }));
}

async function handleVoiceStream(ws, msg) {
  const { audio, history = [] } = msg;
  
  // Decode base64 audio
  const audioBuffer = Buffer.from(audio, 'base64');
  
  // Check voice activity
  if (!detectVoiceActivity(audioBuffer)) {
    ws.send(JSON.stringify({ type: 'voice_stream_end', skipped: true }));
    return;
  }

  // STT
  const text = await stt.transcribe(audioBuffer);
  ws.send(JSON.stringify({ type: 'transcription', text }));

  // LLM streaming with sentence-level TTS
  const messages = [...history, { role: 'user', content: text }];
  let buffer = '';
  let sentenceIndex = 0;

  ws.send(JSON.stringify({ type: 'voice_stream_start' }));

  for await (const chunk of brainChat(messages)) {
    if (chunk.type === 'text_delta' || chunk.type === 'content') {
      const text = chunk.text ?? chunk.content ?? '';
      buffer += text;

      // Check for sentence boundaries
      const match = SENTENCE_END_RE.exec(buffer);
      if (match) {
        const sentence = buffer.slice(0, match.index + match[0].length).trim();
        buffer = buffer.slice(match.index + match[0].length);

        if (sentence) {
          // Generate TTS for this sentence
          const audioData = await tts.synthesize(sentence);
          ws.send(JSON.stringify({
            type: 'audio_chunk',
            audio: audioData.toString('base64'),
            index: sentenceIndex++,
            text: sentence,
          }));
        }
      }
    }
  }

  // Handle remaining buffer (last sentence without punctuation)
  if (buffer.trim()) {
    const audioData = await tts.synthesize(buffer.trim());
    ws.send(JSON.stringify({
      type: 'audio_chunk',
      audio: audioData.toString('base64'),
      index: sentenceIndex++,
      text: buffer.trim(),
    }));
  }

  ws.send(JSON.stringify({ type: 'voice_stream_end', sentenceCount: sentenceIndex }));
}

export function startWakeWordDetection(keyword = process.env.WAKE_WORD || 'hey agent') {
  if (!process.stdin.isTTY) return;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    if (chunk.toLowerCase().includes(keyword.toLowerCase())) {
      const data = JSON.stringify({ type: 'wake', keyword });
      for (const { ws } of registry.values()) {
        if (ws.readyState === ws.OPEN) ws.send(data);
      }
    }
  });
}

// ── WS RPC: all service capabilities over WebSocket ──────────

function reply(ws, _reqId, data) {
  ws.send(JSON.stringify({ _reqId, ...data }));
}

async function handleRpc(ws, msg) {
  const { _reqId, method, params = {} } = msg;
  try {
    let result;
    switch (method) {
      // ── Models ──
      case 'models': {
        const engines = await getEngines();
        const models = [];
        for (const e of engines) {
          const m = await discoverModels(e.id);
          models.push(...m.map(mod => ({ id: mod.name || mod.id, engine: e.id, ...mod })));
        }
        result = models;
        break;
      }

      // ── Embed ──
      case 'embed': {
        const vec = await embed(params.text, params.options);
        result = { embedding: vec };
        break;
      }

      // ── Listen (STT) ──
      case 'listen':
      case 'transcribe': { // compat
        const buf = Buffer.from(params.audio, 'base64');
        const text = await stt.transcribe(buf, params.options);
        result = { text };
        break;
      }

      // ── Speak (TTS) ──
      case 'speak':
      case 'synthesize': { // compat
        const audio = await tts.synthesize(params.text, params.options);
        result = { audio: Buffer.from(audio).toString('base64') };
        break;
      }

      // ── See (Vision) ──
      case 'see':
      case 'vision': { // compat
        const chunks = [];
        for await (const chunk of brainChat(params.messages, { vision: true, ...params.options })) {
          if (chunk.type === 'text_delta') chunks.push(chunk.text);
        }
        result = { text: chunks.join('') };
        break;
      }

      // ── Config ──
      case 'config.get': result = await getConfig(); break;
      case 'config.set': result = await setConfig(params); break;
      case 'assignments.get': result = await getAssignments(); break;
      case 'assignments.set': result = await setAssignments(params); break;
      case 'pool.add': result = await addToPool(params); break;
      case 'pool.remove': result = await removeFromPool(params.id); break;

      // ── Status / Health ──
      case 'health': result = { status: 'ok' }; break;
      case 'status': {
        const config = await getConfig();
        result = { engines: await getEngines(), health: getAllHealth(), config };
        break;
      }
      case 'perf': result = getMetrics(); break;
      case 'queue.stats': result = getQueueStats(); break;
      case 'devices': result = getDevices(); break;
      case 'engines': result = await getEngines(); break;
      case 'engines.health': result = getAllHealth(); break;

      default:
        return reply(ws, _reqId, { type: 'rpc_error', error: `Unknown method: ${method}` });
    }
    reply(ws, _reqId, { type: 'rpc_result', result });
  } catch (err) {
    reply(ws, _reqId, { type: 'rpc_error', error: err.message });
  }
}

export function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    let deviceId = null;

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'register') {
        deviceId = msg.id;
        registerDevice({ id: msg.id, name: msg.name, capabilities: msg.capabilities || [], ws, lastPong: Date.now() });
        ws.send(JSON.stringify({ type: 'registered', id: msg.id }));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else if (msg.type === 'pong' && deviceId) {
        const d = registry.get(deviceId);
        if (d) d.lastPong = Date.now();
      } else if (msg.type === 'wakeword') {
        broadcastWakeword(deviceId);
      } else if (msg.type === 'capture_result') {
        const pending = pendingCaptures.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve(msg.data);
          pendingCaptures.delete(msg.requestId);
        }
      } else if (msg.type === 'chat' || msg.type === 'think') {
        handleChat(ws, msg).catch(err => {
          console.error('[chat error]', err.message);
          try { ws.send(JSON.stringify({ type: 'chat_error', error: err.message, _reqId: msg._reqId })); } catch {}
        });
      } else if (msg.type === 'rpc') {
        handleRpc(ws, msg).catch(err => {
          console.error('[rpc error]', err.message);
          try { ws.send(JSON.stringify({ type: 'rpc_error', error: err.message, _reqId: msg._reqId })); } catch {}
        });
      } else if (msg.type === 'voice_stream') {
        handleVoiceStream(ws, msg).catch(err => {
          console.error('[voice_stream error]', err.message);
          try { ws.send(JSON.stringify({ type: 'error', error: err.message })); } catch {}
        });
      }
    });

    ws.on('close', () => { if (deviceId) unregisterDevice(deviceId); });
    ws.on('error', () => { if (deviceId) unregisterDevice(deviceId); });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [id, device] of registry) {
      if (now - device.lastPong > 60000) {
        unregisterDevice(id);
      } else {
        try { device.ws.send(JSON.stringify({ type: 'ping' })); } catch { unregisterDevice(id); }
      }
    }
  }, 30000);

  return wss;
}

export function closeAllConnections(reason = 'shutdown') {
  for (const [id, device] of registry) {
    try {
      device.ws.send(JSON.stringify({ type: 'shutdown', reason }));
      device.ws.close(1001, reason);
    } catch { /* ignore already-closed connections */ }
  }
  registry.clear();
}
