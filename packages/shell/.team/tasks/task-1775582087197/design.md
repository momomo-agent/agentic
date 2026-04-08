# Design — Bracket Glob Expressions [abc] / [a-z]

## File to Modify
- `src/index.ts`

## Method to Modify: matchGlob()

Current code escapes `[` and `]`, breaking bracket expressions. New logic preserves `[...]` blocks:

```typescript
private matchGlob(name: string, pattern: string): boolean {
  let re = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '[') {
      const close = pattern.indexOf(']', i + 1)
      if (close !== -1) {
        re += pattern.slice(i, close + 1)  // pass [abc] or [a-z] through as regex char class
        i = close + 1
        continue
      }
    }
    if (ch === '*') { re += '.*'; i++; continue }
    if (ch === '?') { re += '.'; i++; continue }
    re += ch.replace(/[.+^${}()|\\]/g, '\\$&')
    i++
  }
  return new RegExp('^' + re + '$').test(name)
}
```

## Methods to Modify: expandGlob() and expandPathArgs()

Add `[` to glob-detection regex:

```typescript
// expandGlob line ~234:
if (!/[*?[]/.test(pattern)) return [pattern]

// expandPathArgs line ~244:
if (a.startsWith('-') || !/[*?[]/.test(a)) { result.push(a); continue }
```

## Edge Cases
- `[` with no closing `]` → treat `[` as literal (fall through to escape path)
- `[^abc]` negated class → passes through as regex `[^abc]`, works correctly

## Test Cases
1. `matchGlob('abc.ts', '[abc]*.ts')` → `true`
2. `matchGlob('def.ts', '[abc]*.ts')` → `false`
3. `matchGlob('b.txt', '[a-z].txt')` → `true`
4. `matchGlob('B.txt', '[a-z].txt')` → `false`
5. `exec('ls [ab]*')` on dir with `[a.ts, b.ts, c.ts]` → returns `a.ts\nb.ts`
