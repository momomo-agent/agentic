import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readme = readFileSync(path.join(__dirname, '../README.md'), 'utf-8');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('PASS:', msg); passed++; }
  else { console.error('FAIL:', msg); failed++; }
}

// DBB-013: npx install
assert(readme.includes('npx agentic-service'), 'DBB-013: README has npx agentic-service');

// DBB-014: docker install
assert(readme.includes('docker'), 'DBB-014: README has docker section');

// DBB-015: REST API docs
assert(readme.includes('/api/chat'), 'DBB-015: README documents /api/chat');
assert(readme.includes('message'), 'DBB-015: README shows request body with message field');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
