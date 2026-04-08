# DBB — m22: Documentation Alignment & Vision Capture

## Overview
Verification criteria for closing documentation gaps where implementation has outpaced specs.

## DBB Criteria

### VISION.md (DBB-doc-vision)

**DBB-doc-vision-001**: VISION.md exists at project root
- Given: project root directory
- When: listing files
- Expect: `VISION.md` exists and is non-empty

**DBB-doc-vision-002**: Product statement is clear
- Given: VISION.md content
- When: reading the document
- Expect: contains a 1-3 sentence product statement explaining what Agentic Shell is and why it exists

**DBB-doc-vision-003**: Target users are defined
- Given: VISION.md content
- When: reading the document
- Expect: lists at least 3 target user personas or use cases (e.g., AI agent developers, cross-platform app builders, in-browser tooling)

**DBB-doc-vision-004**: Differentiators are articulated
- Given: VISION.md content
- When: reading the document
- Expect: at least 2 differentiators vs traditional shells (bash, zsh) or other file abstraction libraries

**DBB-doc-vision-005**: Competitive positioning
- Given: VISION.md content
- When: reading the document
- Expect: mentions or contrasts with at least 2 alternatives (e.g., memfs, browser-fs-access, lightning-fs)

**DBB-doc-vision-006**: Success metrics defined
- Given: VISION.md content
- When: reading the document
- Expect: at least 2 measurable success criteria (e.g., adoption targets, API coverage, platform support)

### ARCHITECTURE.md Update (DBB-doc-arch)

**DBB-doc-arch-001**: Exit codes documented as implemented
- Given: ARCHITECTURE.md "Error Handling" section
- When: reading the document
- Expect: describes that `exec()` returns `{ output: string; exitCode: number }`, exit code derivation logic documented
- Current gap: line 147 says "Exit codes: not currently implemented"

**DBB-doc-arch-002**: Exit codes removed from Future Enhancements
- Given: ARCHITECTURE.md "Future Enhancements" section
- When: reading the document
- Expect: "Exit codes" no longer listed under "Potential Improvements"

**DBB-doc-arch-003**: Environment variables documented as implemented
- Given: ARCHITECTURE.md
- When: reading the document
- Expect: describes `setEnv()`, `$VAR` and `${VAR}` substitution in command parsing
- Current gap: listed in Future Enhancements as "Environment variables ($VAR)"

**DBB-doc-arch-004**: Command substitution documented as implemented
- Given: ARCHITECTURE.md
- When: reading the document
- Expect: describes `$(cmd)` substitution with depth-aware parenthesis matching
- Current gap: listed in Future Enhancements as "Command substitution ($(cmd))"

**DBB-doc-arch-005**: Input/output redirection documented as implemented
- Given: ARCHITECTURE.md
- When: reading the document
- Expect: describes `<` (input redirection), `>` (output overwrite), `>>` (output append) in pipeline processing
- Current gap: listed in Future Enhancements as "Redirection (>, >>, <)"

**DBB-doc-arch-006**: Background jobs documented as implemented
- Given: ARCHITECTURE.md
- When: reading the document
- Expect: describes `&` suffix for background execution, `jobs`, `fg`, `bg` commands
- Current gap: listed in Future Enhancements as "Background jobs (&)" and "Job control (fg, bg, jobs)"

**DBB-doc-arch-007**: Glob patterns documented as implemented
- Given: ARCHITECTURE.md
- When: reading the document
- Expect: describes `*`, `?`, `[...]` glob expansion in `expandPathArgs`/`expandGlob`/`matchGlob`
- Current gap: listed in Future Enhancements as "Glob pattern support (*, ?, [])"

**DBB-doc-arch-008**: No implemented features remain in Future Enhancements
- Given: ARCHITECTURE.md "Future Enhancements" section
- When: reading the document
- Expect: only genuinely unimplemented features remain in Future Enhancements

### Cross-Environment Testing Strategy (DBB-doc-test)

**DBB-doc-test-001**: Testing strategy document exists
- Given: ARCHITECTURE.md or a separate testing strategy document
- When: reading the document
- Expect: cross-environment testing strategy is documented somewhere in the project

**DBB-doc-test-002**: Test matrix defined
- Given: testing strategy document
- When: reading the document
- Expect: specifies which commands/features are tested in which environments (browser, Electron, Node.js)

**DBB-doc-test-003**: Mock strategy documented
- Given: testing strategy document
- When: reading the document
- Expect: describes how MockFileSystem is used and what it covers vs what real-environment tests cover

**DBB-doc-test-004**: CI integration plan
- Given: testing strategy document
- When: reading the document
- Expect: describes how cross-env tests run in CI (if applicable) or manual verification steps

## Verification Method
- Manual review of document contents against DBB criteria
- Checklist-based acceptance: each DBB criterion checked off by reviewer
- No automated tests (documentation-only milestone)
