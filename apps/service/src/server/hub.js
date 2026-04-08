import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
// import * as sense from '../runtime/sense.js'; // Not needed for basic demos
import { chat as brainChat } from './brain.js';
import * as stt from '../runtime/stt.js';
import * as tts from '../runtime/tts.js';
import { detectVoiceActivity } from '../runtime/vad.js';

const SENTENCE_END_RE = /[.!?]+\s+/;

const registry = new Map(); // id → { ws, name, capabilities, lastPong }
const pendingCaptures = new Map(); // requestId → { resolve, reject, timer }
const sessions = new Map(); // sessionId → { data: {}, deviceIds: Set }

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

export function joinSession(sessionId, deviceId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      deviceIds: new Set(),
      history: [],
      brainState: { context: [], systemPrompt: 'You are a helpful AI assistant.', temperature: 0.7 },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      data: {}
    });
  }
  const session = sessions.get(sessionId);
  session.deviceIds.add(deviceId);
  session.lastActivity = Date.now();
  return { sessionId, history: session.history, brainState: session.brainState, deviceCount: session.deviceIds.size };
}

export function setSessionData(sessionId, key, value) {
  if (!sessions.has(sessionId)) sessions.set(sessionId, { id: sessionId, deviceIds: new Set(), history: [], brainState: { context: [], systemPrompt: 'You are a helpful AI assistant.', temperature: 0.7 }, createdAt: Date.now(), lastActivity: Date.now(), data: {} });
  sessions.get(sessionId).data[key] = value;
}

export function getSessionData(sessionId, key) {
  return sessions.get(sessionId)?.data[key] ?? null;
}

export function getSession(sessionId) {
  return sessions.get(sessionId) ?? null;
}

export function broadcastSession(sessionId, message) {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (message) {
    const msg = { ...message, timestamp: Date.now(), sessionId };
    session.history.push(msg);
    session.lastActivity = Date.now();
    if (message.role === 'user' || message.role === 'assistant') {
      session.brainState.context.push(message.content);
      if (session.brainState.context.length > 20) session.brainState.context = session.brainState.context.slice(-20);
    }
    const payload = JSON.stringify({ type: 'session-message', sessionId, message: msg, deviceCount: session.deviceIds.size });
    for (const deviceId of session.deviceIds) {
      const device = registry.get(deviceId);
      if (device) try { device.ws.send(payload); } catch { unregisterDevice(deviceId); }
    }
  } else {
    // Broadcast full session data to session devices only
    const history = (session.data.history || session.history || []).slice(-20);
    const data = { ...session.data, history };
    const msg = JSON.stringify({ type: 'session', sessionId, data });
    for (const deviceId of session.deviceIds) {
      const device = registry.get(deviceId);
      if (device) try { device.ws.send(msg); } catch { unregisterDevice(deviceId); }
    }
  }
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

export function leaveSession(deviceId) {
  for (const [sessionId, session] of sessions) {
    if (session.deviceIds.has(deviceId)) {
      session.deviceIds.delete(deviceId);
      if (session.deviceIds.size === 0) {
        setTimeout(() => {
          if (sessions.get(sessionId)?.deviceIds.size === 0) sessions.delete(sessionId);
        }, 5 * 60 * 1000);
      }
      break;
    }
  }
}

export function unregisterDevice(id) {
  leaveSession(id);
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
    if (chunk.type === 'content') {
      const text = chunk.content ?? chunk.text ?? '';
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
      } else if (msg.type === 'join-session') {
        const state = joinSession(msg.sessionId, deviceId);
        ws.send(JSON.stringify({ type: 'session-joined', ...state }));
      } else if (msg.type === 'capture_result') {
        const pending = pendingCaptures.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve(msg.data);
          pendingCaptures.delete(msg.requestId);
        }
      } else if (msg.type === 'voice_stream') {
        handleVoiceStream(ws, msg).catch(err => {
          ws.send(JSON.stringify({ type: 'error', error: err.message }));
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

  process.once('SIGINT', () => {
    wss.close(() => process.exit(0));
  });

  return wss;
}
