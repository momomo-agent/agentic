# M2 DBB - Provider Robustness & Package Release

## DBB-014: detectProvider throws on missing apiKey
- Requirement: task-1775526862838 (修复 provider apiKey 校验)
- Given: ask() is called with a provider config that has no apiKey
- Expect: throws an error with a message indicating apiKey is missing
- Verify: error is thrown before any model call; message is human-readable

## DBB-015: detectProvider throws on empty string apiKey
- Requirement: task-1775526862838
- Given: ask() is called with apiKey set to ""
- Expect: throws an error (not silent fallthrough)
- Verify: error message references invalid or empty apiKey

## DBB-016: detectProvider succeeds with valid apiKey
- Requirement: task-1775526862838
- Given: ask() is called with a valid non-empty apiKey
- Expect: no error thrown; ask() proceeds normally
- Verify: AgenticResult is returned without provider-related errors

## DBB-017: package.json has publishConfig
- Requirement: task-1775526867192 (npm 发布配置)
- Given: inspect package.json
- Expect: `publishConfig` field exists with at least `access` set
- Verify: `cat package.json | grep publishConfig` returns a result

## DBB-018: README contains npm install instructions
- Requirement: task-1775526867192
- Given: inspect README.md
- Expect: contains `npm install agentic-lite` (or equivalent pnpm/yarn)
- Verify: README.md includes an installation section with the package name

## DBB-019: PRD.md exists and covers core features
- Requirement: task-1775526873714 (编写 PRD.md)
- Given: project root is inspected
- Expect: PRD.md exists and contains sections for agent loop, file tools, and code tool
- Verify: file is non-empty; mentions file_read, file_write, code_exec

## DBB-020: EXPECTED_DBB.md exists with global criteria
- Requirement: task-1775526877132 (编写 EXPECTED_DBB.md)
- Given: project root is inspected
- Expect: EXPECTED_DBB.md exists and defines at least one verifiable acceptance criterion
- Verify: file is non-empty; contains testable criteria
