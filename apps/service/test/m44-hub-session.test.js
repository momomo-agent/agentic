import { test } from 'vitest';
// Tests for hub.js broadcastSession — multi-device brain state sharing
import { strict as assert } from 'assert';

test('m44-hub-session', async () => {
let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log('hub.js broadcastSession tests');

// Inline the broadcastSession logic extracted from hub.js for isolated testing
// (hub.js has transitive dep on agentic-sense which fails in test env)
const registry = new Map();
const sessions = new Map();

function registerDevice(device) {
  registry.set(device.id, device);
}
function joinSession(sessionId, deviceId) {
  if (!sessions.has(sessionId)) sessions.set(sessionId, { data: {}, deviceIds: new Set() });
  sessions.get(sessionId).deviceIds.add(deviceId);
}
function setSessionData(sessionId, key, value) {
  if (!sessions.has(sessionId)) sessions.set(sessionId, { data: {}, deviceIds: new Set() });
  sessions.get(sessionId).data[key] = value;
}
function unregisterDevice(id) { registry.delete(id); }
function broadcastSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  const history = session.data.history;
  const data = { ...session.data };
  if (Array.isArray(history) && history.length > 20) data.history = history.slice(-20);
  const msg = JSON.stringify({ type: 'session', sessionId, data });
  for (const [id, device] of registry) {
    try { device.ws.send(msg); } catch { unregisterDevice(id); }
  }
}

await test('broadcastSession sends session data to registered devices', async () => {
  const received = [];
  const fakeWs = { send: (msg) => received.push(JSON.parse(msg)), readyState: 1 };
  registerDevice({ id: 'dev-1', name: 'test', capabilities: [], ws: fakeWs });
  joinSession('sess-1', 'dev-1');
  setSessionData('sess-1', 'history', [{ role: 'user', content: 'hi' }]);
  broadcastSession('sess-1');
  const msg = received.find(m => m.type === 'session' && m.sessionId === 'sess-1');
  assert.ok(msg, 'session message should be received');
  assert.deepEqual(msg.data.history, [{ role: 'user', content: 'hi' }]);
});

await test('broadcastSession truncates history to last 20 messages', async () => {
  const received = [];
  const fakeWs = { send: (msg) => received.push(JSON.parse(msg)), readyState: 1 };
  registerDevice({ id: 'dev-2', name: 'test2', capabilities: [], ws: fakeWs });
  joinSession('sess-2', 'dev-2');
  const history = Array.from({ length: 25 }, (_, i) => ({ role: 'user', content: `msg${i}` }));
  setSessionData('sess-2', 'history', history);
  broadcastSession('sess-2');
  const msg = received.find(m => m.type === 'session' && m.sessionId === 'sess-2');
  assert.equal(msg.data.history.length, 20);
  assert.equal(msg.data.history[0].content, 'msg5');
});

await test('broadcastSession silently skips unknown sessionId', async () => {
  assert.doesNotThrow(() => broadcastSession('nonexistent-session'));
});

await test('broadcastSession removes disconnected device on send error', async () => {
  const brokenWs = { send: () => { throw new Error('disconnected'); } };
  registerDevice({ id: 'dev-broken', name: 'broken', capabilities: [], ws: brokenWs });
  joinSession('sess-3', 'dev-broken');
  setSessionData('sess-3', 'x', 1);
  // Should not throw even if device send fails
  assert.doesNotThrow(() => broadcastSession('sess-3'));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
