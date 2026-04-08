import { matchProfile } from '../src/detector/matcher.js';
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

// DBB-003: apple-silicon profile
const appleHW = { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 16 };
const appleProfile = matchProfile(profiles, appleHW);
assert(appleProfile?.llm?.model, 'DBB-003: apple-silicon returns profile with llm.model');

// DBB-004: nvidia profile
const nvidiaHW = { platform: 'linux', arch: 'x64', gpu: { type: 'nvidia' }, memory: 8 };
const nvidiaProfile = matchProfile(profiles, nvidiaHW);
assert(nvidiaProfile?.llm?.model, 'DBB-004: nvidia returns profile with llm.model');

// DBB-005: cpu-only profile (gpu: none) — should return gemma3:1b fallback
const cpuHW = { platform: 'linux', arch: 'x64', gpu: { type: 'none' }, memory: 8 };
const cpuProfile = matchProfile(profiles, cpuHW);
assert(cpuProfile?.llm?.model, 'DBB-005: cpu-only returns profile with llm.model');
assert(cpuProfile?.llm?.model === 'gemma3:1b', `DBB-005: cpu-only should return gemma3:1b (got ${cpuProfile?.llm?.model})`);

// DBB-006: empty hardware no crash
let threw = false;
let emptyProfile;
try {
  emptyProfile = matchProfile(profiles, {});
  assert(emptyProfile?.llm?.model, 'DBB-006: empty hardware returns default profile');
} catch (e) {
  threw = true;
  console.error('FAIL: DBB-006 threw exception:', e.message);
  failed++;
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
