# Progress: Normalize Backend Error Handling

## Changes Made

### 1. `src/backends/local-storage.ts` — Added try/catch with IOError wrapping
- `get()`: wraps `localStorage.getItem()` call in try/catch
- `set()`: wraps `localStorage.setItem()` call in try/catch
- `delete()`: wraps `localStorage.removeItem()` call in try/catch
- `list()`: wraps entire iteration loop in try/catch
- All catch blocks check `if (e instanceof IOError) throw e` to avoid double-wrapping (e.g., from `storage()` which already throws IOError when localStorage is unavailable)

### 2. `src/backends/opfs.ts` — scanStream catch logging
- Changed `catch { /* skip unreadable files */ }` to `catch (e) { console.error('[OPFSBackend] scanStream skipping unreadable file:', e) }`

### 3. `src/backends/node-fs.ts` — scanStream catch logging
- Changed `catch { /* skip missing/unreadable files */ }` to `catch (e) { console.error('[NodeFsBackend] scanStream skipping unreadable file:', e) }`

### 4. `test/error-consistency.test.js` — New test file (5 tests)
- `get()` throws IOError when localStorage.getItem throws
- `set()` throws IOError when localStorage.setItem throws
- `delete()` throws IOError when localStorage.removeItem throws
- IOError not double-wrapped when storage() throws
- Normal operations still work after adding error handling

## Verification
- Build: `npx tsup` — success
- New tests: 5/5 pass
- Full suite: 654 pass, 0 fail, 3 skipped
