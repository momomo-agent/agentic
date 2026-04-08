# Design: Add file_delete and file_tree Agent Tool Definitions

## Current State
Both `file_delete` and `file_tree` are already present in `getToolDefinitions()` and `executeTool()` in `src/filesystem.ts` (lines 311-348).

## Action Required
Verify the existing implementation matches the vision spec and write tests confirming:
1. `getToolDefinitions()` returns entries with `name: 'file_delete'` and `name: 'file_tree'`
2. `executeTool('file_delete', {path})` calls `this.delete(path)`
3. `executeTool('file_tree', {prefix})` calls `this.tree(prefix)`

## Files to Modify
None — implementation is complete. Only test coverage needed.

## Test Cases
- `getToolDefinitions()` includes `{name: 'file_delete', ...}` with `required: ['path']`
- `getToolDefinitions()` includes `{name: 'file_tree', ...}` with optional `prefix`
- `executeTool('file_delete', {path: '/foo'})` deletes `/foo`
- `executeTool('file_tree', {})` returns TreeNode structure
