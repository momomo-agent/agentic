# M23 Technical Design — Zero-Config Default Browser Filesystem

## Goal
Two changes: (1) default filesystem in `ask()`, (2) make `apiKey` optional for `provider='custom'`.

## Files Modified

### 1. `src/ask.ts`
- Line 16: already has `config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })`
- **No change needed** — default filesystem is already implemented.

### 2. `src/types.ts`
- `AgenticConfig.apiKey` is already typed as `apiKey?: string` (optional)
- **No change needed** to types.

### 3. `src/providers/provider.ts`
- `detectProvider()` throws when `!config.apiKey` — must guard for custom provider path
- `createProvider()` line 46: already skips apiKey check for `provider='custom'`
- Gap: `detectProvider()` is only called when `config.provider` is undefined, and it throws if no apiKey — this is correct behavior (auto-detect requires a key to identify provider)
- **No change needed** — custom provider path already bypasses apiKey validation

## Conclusion

Reviewing the source: both gaps are already closed in the codebase:
- `ask.ts:16` defaults filesystem to `new AgenticFileSystem({ storage: new MemoryStorage() })`
- `types.ts:14` has `apiKey?: string` (optional)
- `provider.ts:46` skips apiKey validation when `provider !== 'custom'` is false

The tasks are verification/documentation tasks to confirm these work end-to-end and update README.

## Task Breakdown

- **task-1775579577117**: Verify zero-config filesystem default works; update README to document `filesystem` as optional
- **task-1775579679306**: Verify `apiKey` optional for custom provider; ensure `detectProvider` is not called when `provider='custom'` is explicit
