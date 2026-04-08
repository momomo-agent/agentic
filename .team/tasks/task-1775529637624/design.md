# Design: setup.sh Node.js detection and idempotency

## Goal
setup.sh detects existing Node.js and is safe to re-run without side effects.

## Acceptance Criteria
- Re-running setup.sh on an already-configured system produces no errors
- Existing Node.js installation is detected and skipped (not reinstalled)
- No duplicate entries added to PATH or config files

## Approach
1. Check `node --version` before installing — skip if already present
2. Guard all install steps with existence checks
3. Test by running setup.sh twice in sequence

## Files
- `setup.sh`
