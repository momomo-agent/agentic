import { test } from 'vitest';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API_JS = path.join(ROOT, 'src', 'server', 'api.js');
const apiSource = readFileSync(API_JS, 'utf-8');

test('engine-registry-cleanup', { timeout: 30_000 }, async () => {

  await describe('dead file removal', async () => {
    const deadFiles = [
      'src/ui/admin/src/views/LocalModelsView.vue',
      'src/ui/admin/src/views/CloudModelsView.vue',
      'src/ui/admin/src/App-old.vue',
      'src/ui/admin/src/components/ConfigPanel.vue',
      'src/runtime/memory.js',
    ];

    for (const rel of deadFiles) {
      await it(`${rel} should not exist`, () => {
        const abs = path.join(ROOT, rel);
        assert.equal(existsSync(abs), false, `dead file still present: ${rel}`);
      });
    }
  });

  await describe('removed /api/ollama/* routes', async () => {
    await it('should NOT contain /api/ollama/tags route', () => {
      assert.equal(apiSource.includes('/api/ollama/tags'), false, 'api.js still references /api/ollama/tags');
    });

    await it('should NOT contain /api/ollama/pull route', () => {
      assert.equal(apiSource.includes('/api/ollama/pull'), false, 'api.js still references /api/ollama/pull');
    });

    await it('should NOT contain /api/ollama/delete route', () => {
      assert.equal(apiSource.includes('/api/ollama/delete'), false, 'api.js still references /api/ollama/delete');
    });
  });

  await describe('new /api/engines/* routes', async () => {
    await it('should contain POST /api/engines/pull', () => {
      assert.ok(apiSource.includes("/api/engines/pull"), 'api.js is missing POST /api/engines/pull route');
    });

    await it('should contain DELETE /api/engines/models/:name', () => {
      assert.ok(apiSource.includes("/api/engines/models/:name"), 'api.js is missing DELETE /api/engines/models/:name route');
    });
  });

  await describe('GET /api/model-pool deprecation', async () => {
    const getPoolIdx = apiSource.indexOf("r.get('/api/model-pool'");
    const blockEnd = apiSource.indexOf('\n  r.', getPoolIdx + 1);
    const block = apiSource.slice(getPoolIdx, blockEnd === -1 ? undefined : blockEnd);

    await it('should set X-Deprecated header', () => {
      assert.ok(block.includes("X-Deprecated"), 'GET /api/model-pool handler is missing X-Deprecated header');
    });

    await it('should set Deprecation header to true', () => {
      assert.ok(block.includes("'Deprecation'") && block.includes("'true'"), 'missing Deprecation: true header');
    });

    await it('should call discoverModels()', () => {
      assert.ok(block.includes('discoverModels()'), 'should delegate to discoverModels()');
    });
  });

  await describe('/api/model-pool mutation routes preserved', async () => {
    await it('should still have POST /api/model-pool', () => {
      assert.ok(apiSource.includes("r.post('/api/model-pool'"), 'POST /api/model-pool route is missing');
    });

    await it('should still have DELETE /api/model-pool/:id', () => {
      assert.ok(apiSource.includes("r.delete('/api/model-pool/:id'"), 'DELETE /api/model-pool/:id route is missing');
    });
  });

  await describe('config.js import', async () => {
    await it('should NOT import getModelPool', () => {
      const configImportLine = apiSource.split('\n').find((l) => l.includes("from '../config.js'"));
      assert.ok(configImportLine, 'could not locate config.js import line');
      assert.equal(configImportLine.includes('getModelPool'), false, 'api.js still imports getModelPool');
    });
  });

});
