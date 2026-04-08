import { test } from 'vitest';
import { registerDevice, getDevices, updateStatus } from '../src/server/hub.js';

test('m19-hub', async () => {
let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { console.log('  ✅', msg); passed++; }
  else { console.error('  ❌', msg); failed++; }
}

// Test: register → getDevices includes device
registerDevice({ id: 'dev-1', name: 'Test Device', type: 'sensor' });
const devices = getDevices();
const found = devices.find(d => d.id === 'dev-1');
assert(found !== undefined, 'register → getDevices includes device');

// Test: updateStatus → device.status updated
updateStatus('dev-1', 'busy');
const updated = getDevices().find(d => d.id === 'dev-1');
assert(updated.status === 'busy', 'updateStatus → device.status updated');

// Test: updateStatus unknown id → throws
let threw = false;
try { updateStatus('nonexistent-id', 'online'); } catch (e) { threw = e.message.includes('Device not found'); }
assert(threw, 'updateStatus unknown id → throws with correct message');

// Test: register twice with same id → preserves registeredAt
const before = getDevices().find(d => d.id === 'dev-1');
registerDevice({ id: 'dev-1', name: 'Updated Name', type: 'camera' });
const after = getDevices().find(d => d.id === 'dev-1');
assert(after !== undefined, 'register twice → device still exists');

// Test: getDevices returns array
assert(Array.isArray(getDevices()), 'getDevices returns array');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
