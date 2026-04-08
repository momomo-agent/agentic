# m9 Technical Design — README Fix, PRD Sync & DBB Verification

## Tasks

1. Fix README.md — remove rename notice, restore `npm install agentic-lite`
2. Update PRD.md — add `shell_exec` and Python `code_exec` documentation
3. Verify all EXPECTED_DBB.md criteria pass

## Approach

### Task 1: README Fix
- Edit `README.md`: remove the `⚠️ Renamed` section and `agentic-core` references
- Keep the existing `npm install agentic-lite` line at the top

### Task 2: PRD Update
- Add `shell_exec` row to the Tools table
- Add Python note to `code_exec` row

### Task 3: DBB Verification
- Run `pnpm test` and confirm all tests pass
- Manually check each EXPECTED_DBB.md criterion against source/package.json
