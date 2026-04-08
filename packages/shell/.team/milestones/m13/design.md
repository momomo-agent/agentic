# M13 Technical Design — PRD Compliance & Test Coverage Gates

## Overview
Three targeted bug fixes in `src/index.ts` plus a coverage verification task.

## 1. grep -i Fix (task-1775570162531)

**Problem**: The `fs.grep()` code path (line 317) calls `this.fs.grep(pattern)` without passing the `-i` flag — the filesystem's grep is case-sensitive regardless of flag.

**Fix**: When `-i` is set and using the `fs.grep()` path, post-filter results using a case-insensitive regex instead of relying on `fs.grep()`.

```typescript
// line ~317: replace
const results = await this.fs.grep(pattern)
// with
const caseInsensitive = flags.includes('-i')
const results = await this.fs.grep(caseInsensitive ? '(?i)' + pattern : pattern)
// OR: fetch all and filter manually:
const allResults = await this.fs.grep(pattern)
const re = new RegExp(pattern, caseInsensitive ? 'i' : '')
const results = caseInsensitive ? allResults.filter(r => re.test(r.content)) : allResults
```

Use the filter approach (safer, since `fs.grep()` interface doesn't guarantee regex flags support).

## 2. wc Flag Support (task-1775570185511)

**Problem**: `wc` always returns `lines\twords\tchars\tpath` regardless of flags.

**Fix**: Check flags and return only the requested count.

```typescript
private async wc(args: string[]): Promise<string> {
  const flags = args.filter(a => a.startsWith('-'))
  const path = args.find(a => !a.startsWith('-'))
  if (!path) return 'wc: missing operand'
  const r = await this.fs.read(this.resolve(path))
  if (r.error) return this.fsError('wc', path, r.error)
  const content = r.content ?? ''
  const lines = content.split('\n').length
  const words = content.split(/\s+/).filter(Boolean).length
  const chars = content.length
  if (flags.includes('-l')) return String(lines)
  if (flags.includes('-w')) return String(words)
  if (flags.includes('-c')) return String(chars)
  return `${lines}\t${words}\t${chars}\t${path}`
}
```

## 3. touch Empty File Fix (task-1775570192399)

**Problem**: `if (!r.content)` is falsy for empty string `""`, causing touch to overwrite existing empty files.

**Fix**: Change condition to `r.content === undefined`.

```typescript
// line 579: replace
if (!r.content) await this.fs.write(this.resolve(path), '')
// with
if (r.content === undefined) await this.fs.write(this.resolve(path), '')
```

## 4. Coverage Gates (task-1775570192432)

No code changes. Run and document:
```
pnpm test --coverage
```
Verify: statement >= 80%, branch >= 75%, tests >= 148.

## Files to Modify
- `src/index.ts` — grep fix (~line 317), wc fix (~line 604-613), touch fix (~line 579)
- `src/index.test.ts` — new tests per DBB criteria
