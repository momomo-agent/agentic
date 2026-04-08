// Tests for optimizer.js — hardware-adaptive config output
import { strict as assert } from 'assert';
import { optimize } from '../src/detector/optimizer.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log('optimizer.js tests');

test('apple-silicon 16GB → threads=8, memoryLimit=12, model=gemma4:26b', () => {
  const r = optimize({ gpu: { type: 'apple-silicon' }, memory: 16, cpu: { cores: 8 } });
  assert.equal(r.threads, 8); assert.equal(r.memoryLimit, 12); assert.equal(r.model, 'gemma4:26b');
});

test('nvidia vram=8 → threads=4, memoryLimit=6, model=gemma4:13b', () => {
  const r = optimize({ gpu: { type: 'nvidia', vram: 8 }, memory: 16, cpu: { cores: 4 } });
  assert.equal(r.threads, 4); assert.equal(r.memoryLimit, 6); assert.equal(r.model, 'gemma4:13b');
});

test('cpu-only 8GB 4 cores → threads=4, memoryLimit=4, model=gemma2:2b', () => {
  const r = optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } });
  assert.equal(r.threads, 4); assert.equal(r.memoryLimit, 4); assert.equal(r.model, 'gemma2:2b');
});

test('nvidia missing vram → falls back to memory*0.5', () => {
  const r = optimize({ gpu: { type: 'nvidia' }, memory: 16, cpu: { cores: 4 } });
  assert.equal(r.memoryLimit, 6); // floor(16*0.5 * 0.8) = floor(6.4) = 6
});

test('cpu-only missing cores → defaults to 2', () => {
  const r = optimize({ gpu: { type: 'none' }, memory: 8, cpu: {} });
  assert.equal(r.threads, 2);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
