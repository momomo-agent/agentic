# M2: Provider Robustness & Package Release

## Goals
- Fix provider auto-detection validation (missing/invalid apiKey error)
- Add npm publish setup and README install instructions
- Define PRD.md and EXPECTED_DBB.md to unblock 0% match gaps

## Gaps Targeted
- architecture: provider auto-detection no validation/error for missing apiKey (partial → P1)
- vision: no npm-published package / README install instructions (missing → P0)
- prd: PRD.md not found (missing → P0)
- dbb: EXPECTED_DBB.md not found (missing → P0)

## Acceptance Criteria
- detectProvider() throws a clear error when apiKey is missing or invalid
- package.json has `publishConfig`, README has `npm install agentic-lite` instructions
- PRD.md exists with feature coverage
- EXPECTED_DBB.md exists with global verification criteria
