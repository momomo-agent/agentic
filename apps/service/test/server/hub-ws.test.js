import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import WebSocket from 'ws';
import { initWebSocket, getDevices, unregisterDevice } from '../../src/server/hub.js';

let httpServer, wss, port;

function wsConnect() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.once('open', () => resolve(ws));
  });
}

function nextMsg(ws) {
  return new Promise((resolve) => ws.once('message', (d) => resolve(JSON.parse(d))));
}

beforeEach(async () => {
  httpServer = createServer();
  wss = initWebSocket(httpServer);
  await new Promise((r) => httpServer.listen(0, r));
  port = httpServer.address().port;
});

afterEach(async () => {
  getDevices().forEach((d) => unregisterDevice(d.id));
  await new Promise((r) => wss.close(r));
  await new Promise((r) => httpServer.close(r));
});

// DBB-007: device registration
describe('WebSocket device registration (DBB-007)', () => {
  it('register → appears in getDevices()', async () => {
    const ws = await wsConnect();
    ws.send(JSON.stringify({ type: 'register', id: 'dev-1', name: 'Phone', capabilities: ['speak'] }));
    const msg = await nextMsg(ws);
    expect(msg).toEqual({ type: 'registered', id: 'dev-1' });
    expect(getDevices().map((d) => d.id)).toContain('dev-1');
    ws.close();
  });

  it('disconnect removes device', async () => {
    const ws = await wsConnect();
    ws.send(JSON.stringify({ type: 'register', id: 'dev-2', name: 'X', capabilities: [] }));
    await nextMsg(ws);
    await new Promise((r) => { ws.close(); ws.once('close', r); });
    await new Promise((r) => setTimeout(r, 50));
    expect(getDevices().map((d) => d.id)).not.toContain('dev-2');
  });
});

// Ping/pong
describe('ping/pong', () => {
  it('server responds pong to client ping', async () => {
    const ws = await wsConnect();
    ws.send(JSON.stringify({ type: 'register', id: 'dev-3', name: 'Y', capabilities: [] }));
    await nextMsg(ws);
    ws.send(JSON.stringify({ type: 'ping' }));
    const msg = await nextMsg(ws);
    expect(msg.type).toBe('pong');
    ws.close();
  });
});

// sendCommand
describe('sendCommand', () => {
  it('speak command reaches device WS', async () => {
    const { sendCommand } = await import('../../src/server/hub.js');
    const ws = await wsConnect();
    ws.send(JSON.stringify({ type: 'register', id: 'dev-4', name: 'Z', capabilities: ['speak'] }));
    await nextMsg(ws); // registered

    const cmdPromise = sendCommand('dev-4', { type: 'speak', text: 'Hello' });
    const received = await nextMsg(ws);
    expect(received.action).toBe('speak');
    expect(received.text).toBe('Hello');
    await cmdPromise;
    ws.close();
  });

  it('capture resolves with image data', async () => {
    const { sendCommand } = await import('../../src/server/hub.js');
    const ws = await wsConnect();
    ws.send(JSON.stringify({ type: 'register', id: 'dev-5', name: 'Cam', capabilities: ['capture'] }));
    await nextMsg(ws);

    const capturePromise = sendCommand('dev-5', { type: 'capture' });
    const cmd = await nextMsg(ws);
    ws.send(JSON.stringify({ type: 'capture_result', requestId: cmd.requestId, data: 'base64img' }));
    const result = await capturePromise;
    expect(result).toBe('base64img');
    ws.close();
  });

  it('throws for unknown deviceId', async () => {
    const { sendCommand } = await import('../../src/server/hub.js');
    expect(() => sendCommand('nonexistent', { type: 'speak', text: 'x' })).toThrow('Device not found: nonexistent');
  });
});
