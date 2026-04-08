# Technical Design — task-1775614258494: Verify Architecture Alignment Score

## Overview
Verify ARCHITECTURE.md reflects current implementation state, fix known discrepancies, and update .team/gaps/architecture.json.

## Files to Modify
1. `/Users/kenefe/LOCAL/momo-agent/projects/agentic-shell/ARCHITECTURE.md` — fix factual errors
2. `/Users/kenefe/LOCAL/momo-agent/projects/agentic-shell/.team/gaps/architecture.json` — update score

## Known Discrepancies

### Discrepancy 1: Exit Codes
**Current ARCHITECTURE.md** (line ~148):
```
Exit codes: not currently implemented (all commands return strings)
```
**Reality**: `exec()` returns `{output: string; exitCode: number}` — exit codes are implemented.
**Fix**: Update to document that exec() returns `{output, exitCode}` with exitCode 0 for success, 1 for error.

### Discrepancy 2: Glob Pattern Support
**Current ARCHITECTURE.md** (line ~208):
```
Glob pattern support (*, ?, [])
```
Listed under "Future Enhancements".
**Reality**: `matchGlob()`, `expandGlob()`, `expandPathArgs()` implement glob with `*`, `?`, `[abc]`, `[a-z]`, `[!abc]`.
**Fix**: Move to documented feature section. Document that glob expansion happens automatically in path args before command execution.

### Discrepancy 3: Redirection
**Current ARCHITECTURE.md** (line ~212):
```
Redirection (>, >>, <)
```
Listed under "Future Enhancements".
**Reality**: `exec()` handles `>` and `>>` output redirection and `<` input redirection.
**Fix**: Move to documented feature with description of how exec() handles redirection.

### Discrepancy 4: Command Substitution
**Current ARCHITECTURE.md** (line ~211):
```
Command substitution ($(cmd))
```
Listed under "Future Enhancements".
**Reality**: `substituteCommands()` implements `$(cmd)` with nesting support and depth limiting.
**Fix**: Move to documented feature.

### Discrepancy 5: Environment Variables
**Current ARCHITECTURE.md** (line ~209):
```
Environment variables ($VAR)
```
Listed under "Future Enhancements".
**Reality**: `substituteEnv()` implements `$VAR` substitution from env map.
**Fix**: Move to documented feature.

## Implementation Approach

### Option A: Direct Edit (preferred if permissions allow)
Edit ARCHITECTURE.md directly to fix the 5 discrepancies above.

### Option B: Submit CR (if ARCHITECTURE.md is locked)
Submit a CR to `.team/change-requests/cr-{timestamp}.json`:
```json
{
  "id": "cr-{timestamp}",
  "from": "tech_lead",
  "fromLevel": "L3",
  "toLevel": "L2",
  "targetFile": "ARCHITECTURE.md",
  "reason": "ARCHITECTURE.md lists several implemented features as 'Future Enhancements' and states exit codes are 'not currently implemented'. This is factually incorrect and causes architecture gap score to be artificially low.",
  "proposedChange": "Move glob, redirection, command substitution, env vars from 'Future Enhancements' to documented features. Update exit codes section to document exec() return type.",
  "status": "pending",
  "createdAt": "<ISO timestamp>",
  "reviewedAt": null,
  "reviewedBy": null
}
```

## Process After ARCHITECTURE.md Update

### Step 1: Verify ARCHITECTURE.md accuracy
- Read each section against actual source code in src/index.ts
- Confirm no other discrepancies exist

### Step 2: Update architecture.json
- Read current .team/gaps/architecture.json
- Evaluate each gap item against corrected ARCHITECTURE.md
- Calculate new match score
- Write updated file with current timestamp

## Dependencies
- Reads src/index.ts to verify implementation state
- May need CR approval if ARCHITECTURE.md is architect-owned

## Verification
- Check m28/dbb.md DBB-m28-arch-001 through 004
- ARCHITECTURE.md no longer lists implemented features as "Future Enhancements"
- architecture.json has current timestamp and improved score
