import { test } from 'vitest';
import { optimize } from '../src/detector/optimizer.js';
import assert from 'assert';

// cpu.cores undefined → threads = 2
test('m74-optimizer', async () => {
const r1 = optimize({ gpu: { type: 'none' }, memory: 8, cpu: {} });
assert.strictEqual(r1.threads, 2);
assert.strictEqual(r1.memoryLimit, 4);

// amd falls through to fallback
const r2 = optimize({ gpu: { type: 'amd' }, memory: 16, cpu: { cores: 6 } });
assert.strictEqual(r2.threads, 6);
assert.strictEqual(r2.memoryLimit, 8);
assert.strictEqual(r2.model, 'gemma2:2b');
assert.strictEqual(r2.quantization, 'q4');

// nvidia vram undefined → memory * 0.5 * 0.8
const r3 = optimize({ gpu: { type: 'nvidia' }, memory: 32, cpu: { cores: 4 } });
assert.strictEqual(r3.memoryLimit, Math.floor(32 * 0.5 * 0.8));

// apple-silicon memory limit is floor(75%)
const r4 = optimize({ gpu: { type: 'apple-silicon' }, memory: 10, cpu: { cores: 8 } });
assert.strictEqual(r4.memoryLimit, 7);

console.log('All m74 optimizer edge case tests passed');
});
