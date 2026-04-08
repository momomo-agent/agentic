# Design: rm fix fs.delete call

## File to modify
`src/index.ts`

## Root cause analysis
In `rm()` (line 278), non-recursive path:
```ts
let isDir = false
try { await this.fs.ls(resolved); isDir = true } catch {}
if (isDir) return `rm: ${p}: is a directory`
try {
  await this.fs.delete(resolved)  // ← this exists and looks correct
} catch (e: any) { ... }
```
The code looks correct. The actual bug: `fs.delete` may not exist on the interface or is a no-op stub. Check `AgenticFileSystem` type — `delete` may be named differently (e.g. `remove`, `unlink`).

## Fix
Audit the `AgenticFileSystem` interface for the correct delete method name. If it's `remove` or `unlink`, update all `fs.delete(...)` calls:
- `rm()` line ~299
- `rmRecursive()` lines ~273-275
- `mv()` line ~314

## Function signatures (no change to public API)
`private async rm(args: string[]): Promise<string>` — unchanged signature

## Edge cases
- `rm` on nonexistent file: `fs.delete` throws → `fsError()` returns proper message
- `rm /` still blocked by guard check
- `rm -r dir` uses `rmRecursive` which also calls `fs.delete`

## Test cases
- `rm file.txt` → file no longer readable via `fs.read`
- `rm nonexistent` → `rm: nonexistent: No such file or directory`
- `rm dir/` (no -r) → `rm: dir/: is a directory`
- `rm -r dir/` → dir and all contents deleted
