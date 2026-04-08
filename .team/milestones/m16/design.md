# m16 Technical Design — IOError Propagation, stat() Parity & scan() Streaming

## Overview

Four targeted fixes across `NodeFsBackend`, `OPFSBackend`, `AgenticStoreBackend`, and `SQLiteBackend`.

## 1. IOError on raw I/O failures (task-1775583323705)

**Problem:** Backends silently return `null` on I/O errors instead of throwing `IOError`.

**Approach:**
- In each backend's `get/set/delete`, distinguish "not found" (return null / no-op) from "unexpected error" (throw IOError).
- NodeFsBackend: check `e.code === 'ENOENT'` — only swallow that; rethrow others as `IOError`.
- OPFSBackend: check `e instanceof DOMException && e.name === 'NotFoundError'` — only swallow that.
- AgenticStoreBackend: wrap all store calls in try/catch, throw `IOError(String(e))`.

## 2. OPFSBackend.stat() isDirectory (task-1775583337028)

**Problem:** `stat()` always tries `getFileHandle()`, which fails for directories, so always returns `isDirectory: false`.

**Approach:** Try `getFileHandle()` first; if that throws `TypeMismatchError`, try `getDirectoryHandle()` and return `isDirectory: true`.

## 3. AgenticStoreBackend.stat() real mtime (task-1775583337186)

**Problem:** `stat()` returns `Date.now()` instead of actual write time.

**Approach:** Store mtime alongside content. Use a separate meta key `path + '\x00mtime'` in the underlying store. On `set()`, write `Date.now()` to that key. On `stat()`, read it back.

## 4. Streaming scan() for OPFS and AgenticStore (task-1775583337266)

**Problem:** Both backends load full file content before scanning.

**Approach:**
- OPFSBackend: use `File.stream()` → `TextDecoderStream` → process chunks, splitting on `\n`, to yield matches line-by-line without buffering the whole file.
- AgenticStoreBackend: already fetches one file at a time in `scanStream()`; the fix is to ensure no pre-fetching of all keys' values — process each key sequentially (already the case structurally, just verify no `Promise.all` batching).
