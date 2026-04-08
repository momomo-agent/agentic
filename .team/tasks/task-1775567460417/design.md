# Task Design: Complete README performance table and docs

## Objective
Verify and update README.md to ensure performance table, browser support matrix, and custom storage example are complete and accurate.

## Files to Modify

### 1. README.md

## Analysis of Current State

### Performance Table (lines 32-39)
**Current state:** Already complete with all required columns
- ✅ Read (small) column
- ✅ Write (small) column
- ✅ Read (large) column
- ✅ Storage Limit column
- ✅ Browser Support column
- ✅ Best For column

**All 6 backends covered:**
- NodeFsBackend
- OPFSBackend
- AgenticStoreBackend
- LocalStorageBackend
- MemoryBackend
- SQLiteBackend

**Action:** No changes needed. Verify table is accurate.

### Browser Support Matrix (lines 47-54)
**Current state:** Already complete
- ✅ Shows Chrome, Safari, Firefox, Edge, Node.js columns
- ✅ All backends have ✅/❌ values
- ✅ Covers all 6 backends (NodeFs, OPFS, AgenticStore, LocalStorage listed; Memory and SQLite implied)

**Potential improvement:** Add MemoryBackend and SQLiteBackend rows if missing

**Check lines 47-54:**
```markdown
| Backend | Chrome | Safari | Firefox | Edge | Node.js |
|---------|--------|--------|---------|------|---------|
| NodeFsBackend | ❌ | ❌ | ❌ | ❌ | ✅ |
| OPFSBackend | ✅ 86+ | ✅ 15.2+ | ✅ 111+ | ✅ 86+ | ❌ |
| AgenticStoreBackend | ✅ | ✅ | ✅ | ✅ | ❌ |
| LocalStorageBackend | ✅ | ✅ | ✅ | ✅ | ❌ |
```

**Action:** Add missing rows if MemoryBackend and SQLiteBackend are not present:
```markdown
| MemoryBackend | ✅ | ✅ | ✅ | ✅ | ✅ |
| SQLiteBackend | ❌ | ❌ | ❌ | ❌ | ✅ |
```

### Custom Storage Example (line 173)
**Current state:** Already correct
```typescript
async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> { /* ... */ }
```

**Verification:** Return type includes `line: number` field ✅

**Action:** No changes needed.

## Implementation Steps

1. **Read README.md lines 47-54** to check if MemoryBackend and SQLiteBackend rows exist in browser support matrix

2. **If missing, add the rows:**
   - Insert after LocalStorageBackend row (line 54)
   - Add MemoryBackend row: `| MemoryBackend | ✅ | ✅ | ✅ | ✅ | ✅ |`
   - Add SQLiteBackend row: `| SQLiteBackend | ❌ | ❌ | ❌ | ❌ | ✅ |`

3. **Verify performance table** (lines 32-39):
   - Confirm all 6 backends are listed
   - Confirm all columns are present
   - No changes needed unless data is incorrect

4. **Verify custom storage example** (line 173):
   - Confirm scan() signature includes `line: number` in return type
   - No changes needed

## Expected Changes

**Minimal changes expected:**
- Possibly add 2 rows to browser support matrix (MemoryBackend, SQLiteBackend)
- Performance table and custom storage example are already correct

## Verification

After changes:
1. Read README.md lines 32-54 and verify:
   - Performance table has 6 backends with all columns
   - Browser support matrix has 6 backends with all browser columns
2. Read README.md line 173 and verify scan() signature is correct
3. Run `npm test` to ensure no documentation tests fail

## Edge Cases
- If MemoryBackend and SQLiteBackend are already in the browser support matrix, no changes needed
- Performance numbers are approximate and environment-dependent, no need to update unless clearly wrong

## Success Criteria
- README.md performance table is complete (6 backends, 6 columns)
- README.md browser support matrix is complete (6 backends, 5 browser columns)
- README.md custom storage example uses correct scan() signature with `line: number`
- All documentation tests pass
