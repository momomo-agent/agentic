# Design — Glob pattern support in ls and grep

## File to modify
- `src/index.ts`
- `src/index.test.ts`

## Glob matcher utility

```typescript
private matchGlob(name: string, pattern: string): boolean {
  const re = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex special chars
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp('^' + re + '$').test(name)
}
```

## Glob expander

```typescript
private async expandGlob(pattern: string, dir: string): Promise<string[]> {
  if (!/[*?]/.test(pattern)) return [pattern]
  const entries = await this.fs.ls(dir)
  return entries
    .filter(e => e.type === 'file' && this.matchGlob(e.name, pattern))
    .map(e => dir === '/' ? '/' + e.name : dir + '/' + e.name)
}
```

## ls integration

In `ls()`, detect if the path arg contains `*` or `?`:

```typescript
const pathArg = args.find(a => !a.startsWith('-') && !flagValues.has(a))
if (pathArg && /[*?]/.test(pathArg)) {
  const matches = await this.expandGlob(pathArg, this.cwd)
  if (!matches.length) return `ls: ${pathArg}: No such file or directory`
  // list only matched names (already filtered)
  return matches.map(p => p.split('/').pop()!).join('\n')
}
```

## grep integration

In `grep()`, after extracting file args, expand any glob patterns:

```typescript
const expandedFiles: string[] = []
for (const f of fileArgs) {
  const expanded = await this.expandGlob(f, this.cwd)
  expandedFiles.push(...expanded)
}
if (!expandedFiles.length) return `grep: ${fileArgs[0]}: No such file or directory`
// proceed with expandedFiles
```

## Edge cases
- No glob chars → passthrough, no change in behavior
- Glob matches dirs → exclude (only files)
- No matches → error message, exitCode 1
- `?` matches exactly one character

## Test cases (DBB-m12-010 to 014)
- `ls *.ts` with a.ts, b.ts, c.js → lists a.ts and b.ts only
- `ls *.ts` with no .ts files → error, exitCode 1
- `grep hello *.ts` → matches only .ts files
- `grep pattern *.ts` with no .ts files → error, exitCode 1
- `ls a?.ts` with a1.ts, a2.ts, ab.ts → all three returned
