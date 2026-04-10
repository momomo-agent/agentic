# {
  "title": "Fix config-persistence test isolation — cross-file module cache contamination",
  "description": "test/config-persistence.test.js passes in isolation but fails in the full suite. Root cause: when test/server/config-persistence.test.js runs first in the same Vitest worker, it imports src/config.js with CONFIG_DIR pointing to ~/.agentic-service/. The root test then calls vi.resetModules() + dynamic import, but the config module CONFIG_DIR const was already evaluated with the default path. The AGENTIC_CONFIG_DIR env var set in beforeAll is too late if the module was already loaded by another test. Fix: ensure the root config-persistence test gets a clean module by either (a) adding poolMatchGlobs to vitest.config.js to isolate it, or (b) restructuring the test to not depend on module-level const re-evaluation.",
  "priority": "P0",
  "assignee": "developer",
  "groupId": "m98"
}

## Progress

