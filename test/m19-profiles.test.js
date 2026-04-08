import { test } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

test('m19-profiles', async () => {
const __dirname = dirname(fileURLToPath(import.meta.url));
const profilesPath = join(__dirname, '../profiles/default.json');

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  ✅', msg); passed++; }
  else { console.error('  ❌', msg); failed++; }
}

// Test: file is valid JSON
let data;
try {
  data = JSON.parse(readFileSync(profilesPath, 'utf8'));
  assert(true, 'profiles/default.json is valid JSON');
} catch (e) {
  assert(false, 'profiles/default.json is valid JSON: ' + e.message);
  process.exit(1);
}

// Test: has profiles array
assert(Array.isArray(data.profiles), 'has profiles array');

// Test: contains a cpu-only / default fallback entry
const hasDefault = data.profiles.some(p =>
  (p.id === 'default') || (p.match && (p.match.gpu === 'none' || Object.keys(p.match).length === 0))
);
assert(hasDefault, 'contains a default/cpu-only fallback profile');

// Test: each profile has llm config (either top-level or nested under config)
const allHaveLlm = data.profiles.every(p => p.llm || p.config?.llm);
assert(allHaveLlm, 'every profile has llm config');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
