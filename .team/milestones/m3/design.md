# M3 Technical Design — Pagination & Streaming

## Overview
All changes in `src/index.ts`. No new files except additions to `src/index.test.ts`.

## 1. ls Pagination

Add `--page` and `--page-size` flag parsing in `ls()`. After fetching all entries from `this.fs.ls()`, slice the array before formatting output.

```ts
private async ls(args: string[]): Promise<string>
```

- Parse `--page <n>` (1-based, default: none = return all)
- Parse `--page-size <n>` (default: 20)
- Slice: `entries.slice((page-1)*pageSize, page*pageSize)`
- No pagination flags → return all (backward compat)

## 2. grep Streaming

`AgenticFileSystem` currently provides `fs.read()` returning full content. For streaming, check if `fs.readStream()` exists; if so use it, otherwise fall back to `fs.read()`.

```ts
private async grepStream(pattern: string, path: string, flags: string[]): Promise<string>
```

- If `this.fs.readStream` exists: iterate async iterable of lines, test regex per line, collect matches
- Else: fall back to `fs.read()` + split('\n')
- Called from `grep()` when a single file path is provided (non-recursive)

## File Changes
- `src/index.ts` — `ls()` pagination slice, `grep()` delegates to `grepStream()` for single-file case
- `src/index.test.ts` — tests for both features
