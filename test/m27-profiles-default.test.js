import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profiles = JSON.parse(readFileSync(path.join(__dirname, '../profiles/default.json'), 'utf-8'));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('PASS:', msg); passed++; }
  else { console.error('FAIL:', msg); failed++; }
}

// DBB-012: profiles/default.json has cpu-only fallback
const fallback = profiles.profiles.find(e => Object.keys(e.match).length === 0);
assert(fallback != null, 'DBB-012: fallback profile exists (match: {})');
assert(fallback?.config?.llm?.model != null, 'DBB-012: fallback has llm.model');

// Verify it's a lightweight CPU-runnable model
const model = fallback?.config?.llm?.model || '';
assert(model.includes('1b') || model.includes('2b') || model.includes('3b') || model.includes('mini'),
  `DBB-012: fallback model is lightweight (got ${model})`);

// Verify valid JSON structure
assert(profiles.version != null, 'profiles/default.json has version field');
assert(Array.isArray(profiles.profiles), 'profiles/default.json has profiles array');
assert(profiles.profiles.length >= 3, 'profiles has at least 3 entries (apple, nvidia, fallback)');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
