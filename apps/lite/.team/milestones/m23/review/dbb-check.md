# DBB Check — M23

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Criterion | Status |
|-----------|--------|
| DBB-001: Zero-config file_read/file_write works | pass |
| DBB-002: Default filesystem is in-memory and browser-compatible | pass |
| DBB-003: Explicit filesystem still works | pass |
| DBB-004: README documents filesystem as optional | pass |
| DBB-005: provider='custom' skips apiKey validation | pass |
| DBB-006: Missing apiKey throws for anthropic/openai | pass |

## Evidence

- `ask.ts:16` — `const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })` — auto-creates default
- `ask.ts:16` — default uses `MemoryStorage` (no Node fs dependency, browser-compatible)
- `ask.ts:17` — `resolvedConfig` spreads provided filesystem when given
- `README.md:52` — `filesystem?: AgenticFileSystem` shown as optional in AgenticConfig
- `README.md:142-143` — "Uses in-memory filesystem by default (no config required)"
- `provider.ts:46` — `provider !== 'custom'` skips apiKey check
- `provider.ts:46-47` — throws for anthropic/openai without apiKey
