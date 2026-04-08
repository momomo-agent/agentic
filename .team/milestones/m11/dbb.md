# M11 DBB — README Expansion & Type Completeness

## Verification Criteria

### 1. README.md API Documentation
- [ ] README.md contains `ask()` function signature with all parameters documented
- [ ] All tools documented: `code_exec`, `shell_exec`, `file_read`, `file_write`, `search`
- [ ] Provider config table covers all `AgenticConfig` fields
- [ ] At least one working usage example per tool
- [ ] Installation and quick-start sections present

### 2. AgenticResult.shellResults Type Completeness
- [ ] `AgenticResult.shellResults` field exists in `src/types.ts`
- [ ] Type is `ShellResult[]` matching the `ShellResult` interface in `src/tools/shell.ts`
- [ ] `ShellResult` fields: `command: string`, `output: string`, `error?: string`, `exitCode: number`
- [ ] No duplicate `ShellResult` definition (types.ts and shell.ts must be consistent)

## Pass Condition
All checkboxes above verified by tester.
