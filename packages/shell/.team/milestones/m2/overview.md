# Milestone 2: Command Completeness & Permissions

## Goal
Close remaining P0 architecture gaps: rm -r, permission/readOnly checks, cd validation, mkdir -p, and find -type filtering. Bring PRD match from 45% to 70%+.

## Target Gaps
- Architecture gap: "rm does not support -r recursive deletion" (missing) → P0
- Architecture gap: "No error handling for permission/readOnly filesystem" (missing) → P0
- Architecture gap: "cd does not validate target path is existing directory" (partial) → P1
- Architecture gap: "mkdir uses .keep workaround, no -p flag support" (partial) → P1
- Architecture gap: "find -type filtering relies on trailing '/' heuristic" (partial) → P1

## Acceptance Criteria
- [ ] rm -r recursively deletes directories with tests
- [ ] readOnly filesystem rejects write operations with UNIX-compliant errors
- [ ] cd validates target is an existing directory before updating cwd
- [ ] mkdir uses native fs.mkdir() and supports -p flag
- [ ] find -type f/d uses entry.type field, not trailing '/' heuristic

## Dependencies
- Blocked by: m1 test suite (task-1775531299866) — tests must exist before new commands are tested
- m2 tasks should not start until m1 test infrastructure is in place

## Tasks
- TBD: rm -r 递归删除 (P0)
- TBD: 权限/readOnly 检查 (P0)
- TBD: cd 路径验证 (P1)
- TBD: mkdir 原生实现 + -p 支持 (P1)
- TBD: find -type 过滤修复 (P1)

## Timeline
Status: planned
