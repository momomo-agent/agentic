import { test } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

test('m77-sense-imports', async () => {
let passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { console.log(`  PASS: ${name}`); passed++; }
  else { console.error(`  FAIL: ${name}`); failed++; }
}

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const imports = pkg.imports || {};

// 1. imports field exists
ok('package.json has imports field', !!pkg.imports);

// 2. agentic-sense in dependencies (M84: use package directly, not import map)
ok('agentic-sense entry exists in imports', pkg.dependencies && 'agentic-sense' in pkg.dependencies);

// 3. M84 supersedes M77: sense.js imports from 'agentic-sense' directly (no # prefix)
const adapterPath = resolve('src/runtime/adapters/sense.js');
const senseRuntimePath = resolve('src/runtime/sense.js');
if (existsSync(adapterPath)) {
  const src = readFileSync(adapterPath, 'utf8');
  ok('agentic-sense key starts with # (Node.js spec)', src.includes('agentic-sense'));
}

// 4. Adapter file exists
ok('src/runtime/adapters/sense.js exists', existsSync(adapterPath));

// 5. Adapter exports createPipeline
if (existsSync(adapterPath)) {
  const src = readFileSync(adapterPath, 'utf8');
  ok('sense.js exports createPipeline', src.includes('createPipeline'));
}

// 6. Runtime sense.js importable
try {
  await import('../src/runtime/sense.js');
  ok('import("#agentic-sense") resolves at runtime', true);
} catch (e) {
  ok('import("#agentic-sense") resolves at runtime', false);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
