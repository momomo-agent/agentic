# Design: Add shellResults to PRD AgenticResult schema

## Approach
Cannot edit PRD.md directly. Submit a CR to L2/L1.

## CR Content
- targetFile: PRD.md
- proposedChange: Add `shellResults?: ShellResult[]` to the AgenticResult section, matching types.ts definition
- reason: PRD AgenticResult schema is missing shellResults, causing spec/implementation mismatch

## Test Cases
- CR file created at .team/change-requests/cr-{timestamp}.json with status=pending
