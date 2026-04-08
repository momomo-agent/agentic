# DBB Check — M21

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Criterion | Status |
|-----------|--------|
| DBB-001: apiKey optional for custom provider | pass |
| DBB-002: apiKey still required for anthropic provider | pass |
| DBB-003: apiKey still required for openai provider | pass |
| DBB-004: README documents images as required field | pass |
| DBB-005: All existing tests pass | pass |

## Evidence

- `provider.ts:46` — `if (provider !== 'custom' && !config.apiKey)` — skips apiKey check for custom
- `provider.ts:47` — throws `apiKey is required for provider: anthropic` for missing key
- `provider.ts:53` — throws `apiKey is required for provider: openai` for missing key
- `README.md:73` — `images: string[]` (no `?`)
- `test/m21-apikey-optional.test.ts` — custom provider without apiKey passes
- 107/107 tests passing
