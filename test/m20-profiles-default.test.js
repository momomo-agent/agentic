import { test } from 'vitest';
// M20 DBB-007: profiles/default.json exists and has correct structure
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

test('m20-profiles-default', async () => {
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ✅', msg); passed++; }
  else { console.error('  ❌', msg); failed++; }
}

// DBB-007: file parses as valid JSON
let data;
try {
  data = JSON.parse(readFileSync(join(root, 'profiles/default.json'), 'utf8'));
  assert(true, 'DBB-007: profiles/default.json is valid JSON');
} catch (e) {
  assert(false, `DBB-007: profiles/default.json is valid JSON — ${e.message}`);
  process.exit(1);
}

// Has profiles array
assert(Array.isArray(data.profiles), 'has profiles array');

// At least one profile has llm, stt, tts, fallback fields
const hasRequiredFields = data.profiles.some(p => {
  const cfg = p.config || p;
  return cfg.llm && cfg.stt && cfg.tts && 'fallback' in cfg;
});
assert(hasRequiredFields, 'DBB-007: at least one profile has llm, stt, tts, fallback fields');

// Default/fallback profile exists (id=default or match={gpu:"none"} or empty match)
const hasDefault = data.profiles.some(p =>
  p.id === 'default' ||
  (p.match && p.match.gpu === 'none') ||
  (p.match && Object.keys(p.match).length === 0)
);
assert(hasDefault, 'has a default/fallback profile (id=default, gpu=none, or empty match)');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
