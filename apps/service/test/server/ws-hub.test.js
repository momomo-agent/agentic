import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import WebSocket from 'ws';
import {
  registerDevice, unregisterDevice, getDevices,
  initWebSocket, sendCommand,
} from '../../src/server/hub.js';

// Clear registry before each test
beforeEach(() => getDevices().forEach(d => unregisterDevice(d.id)));

// --- Unit tests (no real WS) ---
describe('hub registry', () => {
  it('sendCommand throws for unknown device', () => {
    expect(() => sendCommand('no-such-id', { type: 'speak', text: 'hi' }))
      .toThrow('Device not found: no-such-id');
  });

  it('unregisterDevice rejects pending capture', async () => {
    const fakeWs = { send: () => {} };
    registerDevice({ id: 'd1', name: 'D', capabilities: ['capture'], ws: fakeWs, lastPong: Date.now() });
    const p = sendCommand('d1', { type: 'capture' });
    unregisterDevice('d1');
    await expect(p).rejects.toThrow('Device disconnected');
  });
});

// --- Integration tests with real WS ---
let server, wss, port;

async function startServer() {
  server = http.createServer();
  wss = initWebSocket(server);
  await new Promise(r => server.listen(0, r));
  port = server.address().port;
}

async function stopServer() {
  await new Promise(r => wss.close(r));
  await new Promise(r => server.close(r));
}

function connect() {
  const ws = new WebSocket(`ws://localhost:${port}`);
  return new Promise(r => ws.once('open', () => r(ws)));
}

function nextMsg(ws) {
  return new Promise(r => ws.once('message', d => r(JSON.parse(d))));
}

describe('WebSocket protocol', () => {
  beforeEach(startServer);
  afterEach(stopServer);

  it('register → registered + appears in getDevices()', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'register', id: 'ws-1', name: 'Phone', capabilities: ['speak'] }));
    const msg = await nextMsg(ws);
    expect(msg).toEqual({ type: 'registered', id: 'ws-1' });
    expect(getDevices().find(d => d.id === 'ws-1')).toBeTruthy();
    ws.close();
  });

  it('ping → pong', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'ping' }));
    const msg = await nextMsg(ws);
    expect(msg.type).toBe('pong');
    ws.close();
  });

  it('sendCommand speak → device receives command', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'register', id: 'ws-2', name: 'Speaker', capabilities: ['speak'] }));
    await nextMsg(ws); // registered
    sendCommand('ws-2', { type: 'speak', text: 'Hello' });
    const cmd = await nextMsg(ws);
    expect(cmd.type).toBe('command');
    expect(cmd.action).toBe('speak');
    expect(cmd.text).toBe('Hello');
    ws.close();
  });

  it('sendCommand capture → resolves with data', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'register', id: 'ws-3', name: 'Cam', capabilities: ['capture'] }));
    await nextMsg(ws); // registered
    const p = sendCommand('ws-3', { type: 'capture' });
    const cmd = await nextMsg(ws);
    ws.send(JSON.stringify({ type: 'capture_result', requestId: cmd.requestId, data: 'base64img' }));
    await expect(p).resolves.toBe('base64img');
    ws.close();
  });

  it('disconnect removes device from registry', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'register', id: 'ws-4', name: 'X', capabilities: [] }));
    await nextMsg(ws);
    ws.close();
    await new Promise(r => setTimeout(r, 50));
    expect(getDevices().find(d => d.id === 'ws-4')).toBeUndefined();
  });
});
