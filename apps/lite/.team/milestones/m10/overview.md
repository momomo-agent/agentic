# m10: PRD Compliance — code_exec & Custom Provider

## Goals
Close the two remaining PRD partial gaps after m9 completes.

## Tasks
1. Fix `provider='custom'` to skip apiKey validation when no customProvider hook (PRD: "skips apiKey validation")
2. Verify/document code_exec sandbox choice (quickjs vs AsyncFunction eval) — update PRD or align implementation

## Acceptance Criteria
- `provider='custom'` with only `baseUrl` set does not throw on missing apiKey
- PRD accurately reflects code_exec sandbox mechanism
- All existing tests pass
