# m27 — Command Substitution & Remaining Vision Gaps

## Goals
Close the remaining vision gaps to push Vision match from ~91% (after m22 docs) to ≥93%.

## Scope
1. Implement command substitution `$(cmd)` — allows nested command execution (vision gap: "missing")
2. Add bracket expressions `[abc]` to glob expansion — extends existing glob to support character classes (vision gap: "partial")
3. Update VISION.md/ARCHITECTURE.md if created by m22 to reflect new features

## Acceptance Criteria
- `echo $(pwd)` returns current working directory
- `cat $(which file)` works with nested command output
- `ls [abc]*.txt` matches files starting with a, b, or c
- Nested substitution depth limited to prevent infinite recursion
- Error from inner command propagated to outer command

## Progress
- **Done:** Command substitution $(cmd) implemented
- **Done:** Glob bracket expressions [abc] implemented
- **Todo:** command substitution tests, mkdir fallback workaround, background jobs tests

## Blocked By
m22 (VISION.md should exist before documenting new features) — partially unblocked: command substitution and bracket expressions can proceed with testing
