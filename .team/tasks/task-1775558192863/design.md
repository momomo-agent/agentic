# Task Design: 创建 EXPECTED_DBB.md

## Objective
Create formal Done-By-Definition documentation covering all commands, boundary cases, and quality gates. This becomes the single source of truth for acceptance criteria.

## Files to Create
- `EXPECTED_DBB.md` — new file at project root

## Document Structure

```markdown
# Done-By-Definition (DBB) — Agentic Shell

This document defines the acceptance criteria for all shell commands. Every feature must meet its DBB before being considered complete.

## Quality Gates

### Test Coverage
- Overall statement coverage ≥ 80%
- Branch coverage ≥ 75%
- Every command has at least 3 test cases (happy path, error case, boundary case)

### Performance
- Command execution < 100ms for single file operations
- grep on 1MB file completes in < 500ms
- find on 1000+ file tree completes in < 1s

### Error Handling
- All errors follow UNIX format: `<command>: <path>: <reason>`
- Non-zero exit codes for all error conditions
- No uncaught exceptions or crashes

## Command DBBs

### ls — List Directory
[DBB-001 through DBB-011 from m1/dbb.md]

### cat — Concatenate Files
[Relevant DBBs from milestone files]

### grep — Pattern Search
[DBB-001 through DBB-003 from m1/dbb.md]
[DBB-001 from m4/dbb.md for -i flag]
[New boundary case DBBs]

### find — Search Files
[DBB-002 from m4/dbb.md]
[Relevant DBBs from milestone files]

### pwd — Print Working Directory
[Basic DBB]

### cd — Change Directory
[DBB from m2/dbb.md]

### mkdir — Make Directory
[DBB from m2/dbb.md]

### rm — Remove Files
[DBB-003 from m4/dbb.md]
[Boundary case DBBs from m5]

### mv — Move Files
[Basic DBB]

### cp — Copy Files
[Basic DBB]

### echo — Print Text
[Basic DBB]

### touch — Create Empty File
[Basic DBB]

### head — First N Lines
[Basic DBB]

### tail — Last N Lines
[Basic DBB]

### wc — Word Count
[Basic DBB]

## Pipe Support
[DBB-004 through DBB-006 from m1/dbb.md]
[3+ stage pipe DBBs from m5]

## Error Handling
[DBB-007 through DBB-009 from m1/dbb.md]

## Boundary Cases
[DBB-015 through DBB-017 from m1/dbb.md]
[New boundary DBBs from m5]

## Cross-Environment Consistency
[DBB from m3 for browser/Electron/Node consistency]
```

## Content Sources
Consolidate from:
1. `.team/milestones/m1/dbb.md` — foundation DBBs
2. `.team/milestones/m2/dbb.md` — permissions and command completeness
3. `.team/milestones/m3/dbb.md` — pagination and streaming
4. `.team/milestones/m4/dbb.md` — round 2 command completeness
5. `.team/milestones/m5/dbb.md` — test hardening DBBs

## Implementation Steps

### Step 1: Read all milestone DBB files
```bash
cat .team/milestones/m1/dbb.md
cat .team/milestones/m2/dbb.md
cat .team/milestones/m3/dbb.md
cat .team/milestones/m4/dbb.md
cat .team/milestones/m5/dbb.md
```

### Step 2: Create EXPECTED_DBB.md structure
- Add header and introduction
- Define quality gates section
- Create command sections (one per command)
- Add cross-cutting concerns (pipes, errors, boundaries)

### Step 3: Consolidate DBBs by command
Group all DBBs by command:
- ls: DBB-010, DBB-011 from m1
- grep: DBB-001, DBB-002, DBB-003 from m1; DBB-001 from m4; boundary cases from m5
- rm: DBB-009 from m1; DBB-003 from m4; boundary cases from m5
- etc.

### Step 4: Add missing command DBBs
For commands without explicit DBBs (mv, cp, echo, touch, head, tail, wc), add basic acceptance criteria:
```markdown
### mv — Move Files
**DBB-mv-001**: Basic move
- Given: file `/src.txt` exists, `/dst.txt` does not exist
- When: `mv /src.txt /dst.txt`
- Expect: `/dst.txt` exists with original content, `/src.txt` deleted, exit code 0

**DBB-mv-002**: Move to existing file (overwrite)
- Given: both `/src.txt` and `/dst.txt` exist
- When: `mv /src.txt /dst.txt`
- Expect: `/dst.txt` has src content, `/src.txt` deleted, exit code 0

**DBB-mv-003**: Move non-existent file
- Given: `/nonexistent.txt` does not exist
- When: `mv /nonexistent.txt /dst.txt`
- Expect: error message `mv: /nonexistent.txt: No such file or directory`, exit code non-zero
```

### Step 5: Add quality gates
Define measurable thresholds:
- Test coverage percentages
- Performance benchmarks
- Error handling standards

### Step 6: Review and validate
- Ensure all commands covered
- Verify DBB format consistency (Given/When/Expect or Given/Expect)
- Check that quality gates are measurable

## Success Criteria
- `EXPECTED_DBB.md` exists at project root
- File is 200+ lines (comprehensive coverage)
- All 15 commands have at least one DBB entry
- Quality gates section defines measurable thresholds
- Boundary cases documented (at least 5 entries)
- Document follows consistent format (markdown headers, DBB numbering)
