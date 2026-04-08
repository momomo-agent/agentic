# Design: Verify all EXPECTED_DBB.md criteria pass

## File to Check
- `EXPECTED_DBB.md` — 9 criteria

## Steps

1. Run `pnpm test` — all tests must pass
2. Check each criterion:

| Criterion | How to verify |
|---|---|
| Multi-round loop terminates on `stopReason !== 'tool_use'` | Test: `tests/` suite |
| `file_read`/`file_write` use AgenticFileSystem | `grep 'AgenticFileSystem' src/tools/file.ts` |
| `code_exec` uses AsyncFunction eval | `grep 'AsyncFunction' src/tools/code.ts` |
| `AgenticResult.images` populated | Test: images field in result |
| `systemPrompt` passed to provider | `grep 'systemPrompt' src/ask.ts` |
| `provider='custom'` skips apiKey validation | Test: custom provider path |
| Missing apiKey throws before network call | Test: apiKey validation |
| `publishConfig: { access: "public" }` in package.json | `grep -A2 'publishConfig' package.json` |
| `README.md` contains `npm install agentic-lite` | `grep 'npm install agentic-lite' README.md` |

## Fix Strategy
- If a test fails: fix the source code issue causing the failure
- If README check fails: blocked by task-1775539588263 (must complete first)
- If PRD check is needed: blocked by task-1775539719830

## Dependencies
- Blocked by: task-1775539588263, task-1775539719830
