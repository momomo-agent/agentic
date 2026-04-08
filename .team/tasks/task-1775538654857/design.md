# Design: find recursive directory traversal

## File to modify
`src/index.ts`

## New private helper
```ts
private async findRecursive(
  basePath: string,
  namePattern: RegExp | undefined,
  typeFilter: string | undefined
): Promise<string[]>
```

### Algorithm
1. Call `fs.ls(basePath)` to get entries
2. For each entry:
   - Build `fullPath = basePath.replace(/\/$/, '') + '/' + entry.name`
   - If `entry.type === 'dir'`: recurse into `findRecursive(fullPath, namePattern, typeFilter)`
   - Apply `typeFilter` ('f' = file only, 'd' = dir only) — skip non-matching entries
   - Apply `namePattern` regex against `entry.name` — skip non-matching
   - Push `fullPath` to results if passes both filters
3. Return accumulated results

### `find()` method (line 199)
Replace body with:
```ts
const results = await this.findRecursive(this.resolve(basePath), nameRegex, typeFilter)
return results.join('\n')
```

## Edge cases
- Empty directory: returns `''`
- `fs.ls` throws on subdir (permission/missing): catch and skip that subdir
- `-type d` includes the subdir entry itself
- Circular symlinks: not handled (AgenticFileSystem doesn't model symlinks)

## Test cases
- `find /dir` returns files in `/dir` and all subdirs
- `find /dir -name "*.ts"` matches nested `.ts` files
- `find /dir -type f` returns only files recursively
- `find /dir -type d` returns only directories recursively
- `find /empty` returns `''`
