/**
 * engine-registry-cleanup.test.js
 *
 * Verifies the dead-file cleanup and route migration performed in
 * task-1775887206320.  All checks are static (filesystem + source text)
 * so no server is started.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API_JS = path.join(ROOT, 'src', 'server', 'api.js');
const apiSource = readFileSync(API_JS, 'utf-8');

// 1. Dead files must not exist

describe('dead file removal', () => {
  const deadFiles = [
    'src/ui/admin/src/views/LocalModelsView.vue',
    'src/ui/admin/src/views/CloudModelsView.vue',
    'src/ui/admin/src/App-old.vue',
    'src/ui/admin/src/components/ConfigPanel.vue',
    'src/runtime/memory.js',
  ];

  for (const rel of deadFiles) {
    it(`${rel} should not exist`, () => {
      expect(existsSync(path.join(ROOT, rel))).toBe(false);
    });
  }
});

// 2. Removed /api/ollama/* routes

describe('removed /api/ollama/* routes', () => {
  it('should NOT contain /api/ollama/tags route', () => {
    expect(apiSource).not.toContain('/api/ollama/tags');
  });

  it('should NOT contain /api/ollama/pull route', () => {
    expect(apiSource).not.toContain('/api/ollama/pull');
  });

  it('should NOT contain /api/ollama/delete route', () => {
    expect(apiSource).not.toContain('/api/ollama/delete');
  });
});

// 3. New engine routes exist

describe('new /api/engines/* routes', () => {
  it('should contain POST /api/engines/pull', () => {
    expect(apiSource).toContain('/api/engines/pull');
  });

  it('should contain DELETE /api/engines/models/:name', () => {
    expect(apiSource).toContain('/api/engines/models/:name');
  });
});

// 4. GET /api/model-pool deprecation headers

describe('GET /api/model-pool deprecation', () => {
  const getPoolIdx = apiSource.indexOf("r.get('/api/model-pool'");
  const blockEnd = apiSource.indexOf('\n  r.', getPoolIdx + 1);
  const block = apiSource.slice(getPoolIdx, blockEnd === -1 ? undefined : blockEnd);

  it('should set X-Deprecated header', () => {
    expect(block).toContain('X-Deprecated');
  });

  it('should set Deprecation header to true', () => {
    expect(block).toContain("'Deprecation'");
    expect(block).toContain("'true'");
  });

  it('should call discoverModels()', () => {
    expect(block).toContain('discoverModels()');
  });
});

// 5. POST and DELETE /api/model-pool still present

describe('/api/model-pool mutation routes preserved', () => {
  it('should still have POST /api/model-pool', () => {
    expect(apiSource).toContain("r.post('/api/model-pool'");
  });

  it('should still have DELETE /api/model-pool/:id', () => {
    expect(apiSource).toContain("r.delete('/api/model-pool/:id'");
  });
});

// 6. getModelPool is NOT imported from config.js

describe('config.js import', () => {
  it('should NOT import getModelPool', () => {
    const configImportLine = apiSource.split('\n').find((l) => l.includes("from '../config.js'"));
    expect(configImportLine).toBeTruthy();
    expect(configImportLine).not.toContain('getModelPool');
  });
});
