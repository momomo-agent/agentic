import { test } from 'vitest';
import { optimize } from '../src/detector/optimizer.js';
import assert from 'assert';

// Apple Silicon
test('optimizer', async () => {
const r1 = optimize({ gpu: { type: 'apple-silicon' }, memory: 16, cpu: { cores: 8 } });
assert.strictEqual(r1.threads, 8);
assert.strictEqual(r1.memoryLimit, 12);
assert.strictEqual(r1.model, 'gemma4:26b');
assert.strictEqual(r1.quantization, 'q8');

// NVIDIA
const r2 = optimize({ gpu: { type: 'nvidia', vram: 8 }, memory: 16, cpu: { cores: 4 } });
assert.strictEqual(r2.threads, 4);
assert.strictEqual(r2.memoryLimit, 6);
assert.strictEqual(r2.model, 'gemma4:13b');
assert.strictEqual(r2.quantization, 'q4');

// CPU-only
const r3 = optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } });
assert.strictEqual(r3.threads, 4);
assert.strictEqual(r3.memoryLimit, 4);
assert.strictEqual(r3.model, 'gemma2:2b');
assert.strictEqual(r3.quantization, 'q4');

// DBB: all four fields present
['threads','memoryLimit','model','quantization'].forEach(f => assert.ok(f in r3, `missing ${f}`));

// NVIDIA no vram fallback
const r4 = optimize({ gpu: { type: 'nvidia' }, memory: 16, cpu: { cores: 4 } });
assert.ok(r4.memoryLimit > 0);

console.log('All tests passed');
});
