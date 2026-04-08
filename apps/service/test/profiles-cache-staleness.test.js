import { test } from 'vitest';
import assert from 'assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('profiles-cache-staleness', async () => {
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  function isCacheExpired(timestamp) { return Date.now() - timestamp > CACHE_MAX_AGE; }

  assert.strictEqual(isCacheExpired(Date.now() - 8 * 24 * 60 * 60 * 1000), true);
  assert.strictEqual(isCacheExpired(Date.now() - 1 * 24 * 60 * 60 * 1000), false);
  assert.strictEqual(isCacheExpired(Date.now() - CACHE_MAX_AGE), false);
  assert.strictEqual(isCacheExpired(Date.now() - CACHE_MAX_AGE - 1), true);

  const src = readFileSync(join(__dirname, '../src/detector/profiles.js'), 'utf8');
  assert.ok(src.includes('timestamp: Date.now()'));
  assert.ok(src.includes('isCacheExpired(cached.timestamp)'));
});
