import { test } from 'vitest';
// M80: Cross-device brain state sharing tests
// Tests joinSession() and broadcastSession() with full conversation history

import { strict as assert } from 'assert';
import { joinSession, broadcastSession, getSession, leaveSession } from '../src/server/hub.js';

test('m80-hub-cross-device-state', async () => {
let passed = 0, failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    console.error(e.stack);
    failed++;
  }
}

console.log('M80: Cross-device brain state sharing tests\n');

// Test 1: joinSession creates new session with empty history
await test('joinSession creates new session with empty history', async () => {
  const sessionId = 'test-session-1';
  const deviceId = 'device-1';

  const result = joinSession(sessionId, deviceId);

  assert.ok(result, 'joinSession should return result');
  assert.equal(result.sessionId, sessionId, 'sessionId should match');
  assert.ok(Array.isArray(result.history), 'history should be an array');
  assert.equal(result.history.length, 0, 'new session should have empty history');
  assert.ok(result.brainState, 'brainState should exist');
  assert.ok(Array.isArray(result.brainState.context), 'brainState.context should be array');
  assert.equal(result.deviceCount, 1, 'deviceCount should be 1');
});

// Test 2: joinSession returns existing history for existing session
await test('joinSession returns full history for existing session', async () => {
  const sessionId = 'test-session-2';
  const device1 = 'device-2a';
  const device2 = 'device-2b';

  // First device joins and creates session
  joinSession(sessionId, device1);

  // Add some messages to history
  broadcastSession(sessionId, { role: 'user', content: 'Hello', deviceId: device1 });
  broadcastSession(sessionId, { role: 'assistant', content: 'Hi there!', deviceId: device1 });

  // Second device joins same session
  const result = joinSession(sessionId, device2);

  assert.equal(result.history.length, 2, 'should receive full history');
  assert.equal(result.history[0].content, 'Hello', 'first message should be preserved');
  assert.equal(result.history[1].content, 'Hi there!', 'second message should be preserved');
  assert.equal(result.deviceCount, 2, 'deviceCount should be 2');
});

// Test 3: broadcastSession adds message to history
await test('broadcastSession adds message to history', async () => {
  const sessionId = 'test-session-3';
  const deviceId = 'device-3';

  joinSession(sessionId, deviceId);

  const message = { role: 'user', content: 'Test message', deviceId };
  broadcastSession(sessionId, message);

  const session = getSession(sessionId);
  assert.ok(session, 'session should exist');
  assert.equal(session.history.length, 1, 'history should have 1 message');
  assert.equal(session.history[0].content, 'Test message', 'message content should match');
  assert.ok(session.history[0].timestamp, 'message should have timestamp');
  assert.equal(session.history[0].sessionId, sessionId, 'message should have sessionId');
});

// Test 4: broadcastSession updates brainState context
await test('broadcastSession updates brainState context', async () => {
  const sessionId = 'test-session-4';
  const deviceId = 'device-4';

  joinSession(sessionId, deviceId);

  broadcastSession(sessionId, { role: 'user', content: 'User message', deviceId });
  broadcastSession(sessionId, { role: 'assistant', content: 'Assistant reply', deviceId });

  const session = getSession(sessionId);
  assert.equal(session.brainState.context.length, 2, 'context should have 2 entries');
  assert.equal(session.brainState.context[0], 'User message', 'first context entry should match');
  assert.equal(session.brainState.context[1], 'Assistant reply', 'second context entry should match');
});

// Test 5: brainState context limited to 20 messages
await test('brainState context limited to last 20 messages', async () => {
  const sessionId = 'test-session-5';
  const deviceId = 'device-5';

  joinSession(sessionId, deviceId);

  // Add 25 messages
  for (let i = 0; i < 25; i++) {
    broadcastSession(sessionId, { role: 'user', content: `Message ${i}`, deviceId });
  }

  const session = getSession(sessionId);
  assert.equal(session.brainState.context.length, 20, 'context should be limited to 20');
  assert.equal(session.brainState.context[0], 'Message 5', 'should keep last 20 messages');
  assert.equal(session.brainState.context[19], 'Message 24', 'last message should be preserved');
});

// Test 6: Multiple devices in same session
await test('Multiple devices share same session state', async () => {
  const sessionId = 'test-session-6';
  const device1 = 'device-6a';
  const device2 = 'device-6b';
  const device3 = 'device-6c';

  joinSession(sessionId, device1);
  joinSession(sessionId, device2);
  joinSession(sessionId, device3);

  broadcastSession(sessionId, { role: 'user', content: 'Shared message', deviceId: device1 });

  const session = getSession(sessionId);
  assert.equal(session.deviceIds.size, 3, 'session should have 3 devices');
  assert.equal(session.history.length, 1, 'all devices should see same history');
  assert.ok(session.deviceIds.has(device1), 'device1 should be in session');
  assert.ok(session.deviceIds.has(device2), 'device2 should be in session');
  assert.ok(session.deviceIds.has(device3), 'device3 should be in session');
});

// Test 7: Device joins mid-conversation receives full history
await test('Device joining mid-conversation receives full history', async () => {
  const sessionId = 'test-session-7';
  const device1 = 'device-7a';
  const device2 = 'device-7b';

  // Device 1 starts conversation
  joinSession(sessionId, device1);
  broadcastSession(sessionId, { role: 'user', content: 'First message', deviceId: device1 });
  broadcastSession(sessionId, { role: 'assistant', content: 'First reply', deviceId: device1 });
  broadcastSession(sessionId, { role: 'user', content: 'Second message', deviceId: device1 });

  // Device 2 joins mid-conversation
  const result = joinSession(sessionId, device2);

  assert.equal(result.history.length, 3, 'should receive all 3 messages');
  assert.equal(result.history[0].content, 'First message', 'first message preserved');
  assert.equal(result.history[1].content, 'First reply', 'second message preserved');
  assert.equal(result.history[2].content, 'Second message', 'third message preserved');
  assert.equal(result.brainState.context.length, 3, 'brainState context should match');
});

// Test 8: leaveSession removes device from session
await test('leaveSession removes device from session', async () => {
  const sessionId = 'test-session-8';
  const device1 = 'device-8a';
  const device2 = 'device-8b';

  joinSession(sessionId, device1);
  joinSession(sessionId, device2);

  let session = getSession(sessionId);
  assert.equal(session.deviceIds.size, 2, 'should have 2 devices');

  leaveSession(device1);

  session = getSession(sessionId);
  assert.equal(session.deviceIds.size, 1, 'should have 1 device after leave');
  assert.ok(!session.deviceIds.has(device1), 'device1 should be removed');
  assert.ok(session.deviceIds.has(device2), 'device2 should remain');
});

// Test 9: System messages don't update brainState context
await test('System messages do not update brainState context', async () => {
  const sessionId = 'test-session-9';
  const deviceId = 'device-9';

  joinSession(sessionId, deviceId);

  broadcastSession(sessionId, { role: 'system', content: 'System notification', deviceId });
  broadcastSession(sessionId, { role: 'user', content: 'User message', deviceId });

  const session = getSession(sessionId);
  assert.equal(session.history.length, 2, 'history should have 2 messages');
  assert.equal(session.brainState.context.length, 1, 'context should only have user message');
  assert.equal(session.brainState.context[0], 'User message', 'only user message in context');
});

// Test 10: Session preserves brainState configuration
await test('Session preserves brainState configuration', async () => {
  const sessionId = 'test-session-10';
  const deviceId = 'device-10';

  const result = joinSession(sessionId, deviceId);

  assert.ok(result.brainState.systemPrompt, 'systemPrompt should exist');
  assert.equal(typeof result.brainState.temperature, 'number', 'temperature should be a number');
  assert.equal(result.brainState.temperature, 0.7, 'default temperature should be 0.7');
});

// Test 11: Empty session returns null from getSession
await test('getSession returns null for non-existent session', async () => {
  const session = getSession('non-existent-session');
  assert.equal(session, null, 'should return null for non-existent session');
});

// Test 12: broadcastSession handles non-existent session gracefully
await test('broadcastSession handles non-existent session gracefully', async () => {
  // Should not throw
  assert.doesNotThrow(() => {
    broadcastSession('non-existent-session', { role: 'user', content: 'test' });
  }, 'should not throw for non-existent session');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
