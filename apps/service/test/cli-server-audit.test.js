import { test } from 'vitest';
import assert from 'assert';
import { readFileSync, existsSync } from 'fs';

test('cli-server-audit', async () => {
const CR_PATH = '.team/change-requests/cr-1775527933536.json';

// Test 1: CR file exists
assert.ok(existsSync(CR_PATH), 'CR file must exist');
console.log('PASS: CR file exists');

// Test 2: CR has required schema fields
const cr = JSON.parse(readFileSync(CR_PATH, 'utf8'));
assert.ok(cr.id, 'CR must have id');
assert.ok(cr.from, 'CR must have from');
assert.ok(cr.reason, 'CR must have reason');
assert.ok(cr.status, 'CR must have status');
console.log('PASS: CR has required schema fields');

// Test 3: CR references the correct files
const reason = cr.reason + (cr.proposedChange || '');
assert.ok(reason.includes('src/cli') || reason.includes('cli/'), 'CR must reference src/cli/');
assert.ok(reason.includes('cert.js') || reason.includes('httpsServer') || reason.includes('middleware'), 'CR must reference server files');
console.log('PASS: CR references correct files');

// Test 4: All audited source files exist (not deleted)
const files = [
  'src/cli/setup.js',
  'src/cli/browser.js',
  'src/server/cert.js',
  'src/server/httpsServer.js',
  'src/server/middleware.js',
];
for (const f of files) {
  assert.ok(existsSync(f), `Source file must exist: ${f}`);
}
console.log('PASS: All audited source files exist');

console.log('\n4 passed, 0 failed');
});
