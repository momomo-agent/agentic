# Design: Add delete and tree agent tool definitions

## Analysis
Both tools already exist in `src/filesystem.ts`:
- `getToolDefinitions()` includes `file_delete` and `tree`
- `executeTool()` handles `case 'file_delete'` and `case 'tree'`

## Files to Modify
None — implementations already exist.

## Verification Steps
1. `npm run build` — no TS errors
2. `npm test` — DBB-010 through DBB-013 pass
3. Confirm `getToolDefinitions()` returns array containing `{name: 'file_delete'}` and `{name: 'file_tree'}` (note: DBB uses `file_tree` but code uses `tree` — check if name mismatch needs fixing)

## Potential Issue
DBB-012/013 expect tool name `file_tree` but `filesystem.ts` defines it as `tree`. If tests check for `file_tree`, rename the tool definition and case handler from `tree` to `file_tree`.

## File: `src/filesystem.ts`
If rename needed:
- Line ~327: `name: 'tree'` → `name: 'file_tree'`
- Line ~352: `case 'tree':` → `case 'file_tree':`
