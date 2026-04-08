import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('PASS:', msg); passed++; }
  else { console.error('FAIL:', msg); failed++; }
}

// DBB-009: admin route in api.js
const api = readFileSync(path.join(root, 'src/server/api.js'), 'utf-8');
assert(api.includes('/admin'), 'DBB-009: api.js has /admin route');
assert(existsSync(path.join(root, 'dist/admin/index.html')), 'DBB-009: dist/admin/index.html exists after build');

// DBB-010: Dockerfile exists and has build step
const dockerfile = readFileSync(path.join(root, 'install/Dockerfile'), 'utf-8');
assert(existsSync(path.join(root, 'install/Dockerfile')), 'DBB-010: Dockerfile exists');
assert(dockerfile.includes('npm run build'), 'DBB-010: Dockerfile includes npm run build');
assert(dockerfile.includes('EXPOSE 3000'), 'DBB-010: Dockerfile exposes port 3000');

// DBB-012: setup.sh exists and has basic structure
const setup = readFileSync(path.join(root, 'install/setup.sh'), 'utf-8');
assert(existsSync(path.join(root, 'install/setup.sh')), 'DBB-012: setup.sh exists');
assert(setup.includes('node'), 'DBB-012: setup.sh references node');
assert(setup.includes('npm install') || setup.includes('npm ci'), 'DBB-012: setup.sh runs npm install');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
