# Fix standalone grep no-match exit code

## Progress

### Changes Made

#### src/index.ts (lines 188-191)
Fixed standalone grep to return exitCode 1 when no matches found. The pipe case already had this fix (line 180) but the standalone (non-pipe) path in `execPipeline()` was missing it.

**Before:**
```typescript
const output = await this.execSingle(trimmed)
return { output, exitCode: this.exitCodeFor(output) }
```

**After:**
```typescript
const output = await this.execSingle(trimmed)
const cmd = trimmed.split(/\s+/)[0]
const exitCode = (cmd === 'grep' && output === '') ? 1 : this.exitCodeFor(output)
return { output, exitCode }
```

#### test/standalone-grep-exit-code-m29.test.ts (new)
Added 5 tests covering:
- Standalone grep no-match → exitCode 1
- Standalone grep match → exitCode 0
- Standalone grep -i no-match → exitCode 1
- Standalone grep on nonexistent file → exitCode 1
- cat of empty file still returns exitCode 0 (regression guard)

### Test Results
- New tests: 5/5 passed
- Full suite: 513/520 passed (7 pre-existing failures in architecture-alignment-m28.test.ts unrelated to this change)

### Notes
- No CR needed — design was clear and implementation was straightforward
- Used `readStream` mock pattern (matching existing grep tests) to avoid streaming warning messages
