import { describe, it, expect } from 'vitest';

async function getHub() {
  const mod = await import('../../src/server/hub.js');
  return mod;
}

function mockWs() {
  const sent = [];
  return { ws: { send: msg => sent.push(JSON.parse(msg)) }, sent };
}

describe('DBB-004: speak command routed to device', () => {
  it('sendCommand speak → device receives action:speak', async () => {
    const { registerDevice, sendCommand } = await getHub();
    const { ws, sent } = mockWs();
    const id = `speak-${Date.now()}`;
    registerDevice({ id, name: 'dev', capabilities: [], ws, lastPong: Date.now() });

    const result = sendCommand(id, { type: 'speak', text: 'hello' });
    await result;

    expect(sent.some(m => m.action === 'speak' && m.text === 'hello')).toBe(true);
  });
});

describe('DBB-005: display command routed to device', () => {
  it('sendCommand display → device receives action:display', async () => {
    const { registerDevice, sendCommand } = await getHub();
    const { ws, sent } = mockWs();
    const id = `display-${Date.now()}`;
    registerDevice({ id, name: 'dev', capabilities: [], ws, lastPong: Date.now() });

    const result = sendCommand(id, { type: 'display', content: '<h1>hi</h1>' });
    await result;

    expect(sent.some(m => m.action === 'display' && m.content === '<h1>hi</h1>')).toBe(true);
  });
});

describe('DBB-006: capture command still works (no regression)', () => {
  it('sendCommand capture → returns Promise', async () => {
    const { registerDevice, sendCommand } = await getHub();
    const { ws } = mockWs();
    const id = `capture-${Date.now()}`;
    registerDevice({ id, name: 'dev', capabilities: [], ws, lastPong: Date.now() });

    const p = sendCommand(id, { type: 'capture' });
    expect(p).toBeInstanceOf(Promise);
  });
});

describe('DBB-007: unknown command type throws', () => {
  it('sendCommand fly → throws Unsupported command type', async () => {
    const { registerDevice, sendCommand } = await getHub();
    const { ws } = mockWs();
    const id = `unknown-${Date.now()}`;
    registerDevice({ id, name: 'dev', capabilities: [], ws, lastPong: Date.now() });

    expect(() => sendCommand(id, { type: 'fly' })).toThrow('Unsupported command type: fly');
  });
});
