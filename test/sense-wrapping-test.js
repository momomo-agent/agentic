import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Test 1: #agentic-sense adapter imports from agentic-sense package
const adapterPath = new URL('../src/runtime/adapters/sense.js', import.meta.url).pathname;
const adapterSrc = require('node:fs').readFileSync(adapterPath, 'utf8');
assert.ok(adapterSrc.includes("from 'agentic-sense'"), 'adapter must import from agentic-sense package');
console.log('PASS: adapter imports from agentic-sense package');

// Test 2: agentic-sense package exists in node_modules
let pkg;
try { pkg = require('agentic-sense'); } catch { pkg = null; }
assert.ok(pkg !== null, 'agentic-sense package must be resolvable');
console.log('PASS: agentic-sense package is resolvable');

// Test 3: sense.js imports from local adapter (not #agentic-sense alias)
const senseSrc = require('node:fs').readFileSync(
  new URL('../src/runtime/sense.js', import.meta.url).pathname, 'utf8'
);
assert.ok(senseSrc.includes("from './adapters/sense.js'"), 'sense.js must import from ./adapters/sense.js');
console.log('PASS: sense.js imports from ./adapters/sense.js adapter');

// Test 4: package.json imports map does NOT have #agentic-sense (using npm package directly)
const imports = require('../package.json').imports;
assert.ok(!imports['#agentic-sense'], '#agentic-sense should NOT be in imports map (using npm package directly)');
console.log('PASS: package.json imports map has no #agentic-sense (npm package used directly)');

// Test 5: createPipeline returns object with detect function
const { createPipeline } = await import('../src/runtime/adapters/sense.js');
const pipeline = createPipeline({ face: true });
assert.ok(typeof pipeline.detect === 'function', 'pipeline must have detect()');
console.log('PASS: createPipeline returns object with detect()');

// Test 6: detect returns expected shape
const result = pipeline.detect(null);
assert.ok(Array.isArray(result.faces), 'detect result must have faces array');
assert.ok(Array.isArray(result.gestures), 'detect result must have gestures array');
assert.ok(Array.isArray(result.objects), 'detect result must have objects array');
console.log('PASS: detect() returns {faces, gestures, objects}');

console.log('\nAll 6 tests passed.');
