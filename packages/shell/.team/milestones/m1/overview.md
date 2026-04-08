# Milestone 1: Foundation & Quality Gate

## Goal
Establish testing infrastructure and implement critical missing features to bring PRD match from 45% to 75%+.

## Scope
1. **Test Infrastructure** - Zero to comprehensive test coverage
2. **Command Enhancement** - grep -r recursive search, pipe support
3. **Error Handling** - Standardize UNIX-compliant error messages
4. **Quality Gate** - All commands must have unit tests before m1 completion

## Target Gaps
- PRD gap: "No test coverage" (status: missing) → P0
- PRD gap: "grep -r recursive search not implemented" (status: missing) → P0
- PRD gap: "Pipe support not implemented" (status: missing) → P0
- Architecture gap: "No test coverage" (status: missing) → P0

## Acceptance Criteria
- [ ] Test suite with >80% coverage for all commands
- [ ] grep -r recursive search working with tests
- [ ] Pipe support (cat file | grep pattern) working with tests
- [ ] Error messages conform to UNIX standards
- [ ] All tests passing in CI

## Dependencies
- Blocked by: Missing ARCHITECTURE.md (CR submitted)
- Blocked by: Missing EXPECTED_DBB.md (CR submitted)

## Tasks
- task-1775531299796: 增强 grep 命令 (P0)
- task-1775531299831: pipe 支持 (P0)
- task-1775531299866: 添加测试套件 (P0)
- task-1775531687828: 标准化错误处理 (P1)
- task-1775531687871: ls -a 隐藏文件支持 (P1)

## Timeline
Estimated: 2-3 sprints
Status: active
