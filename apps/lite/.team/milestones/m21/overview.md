# Milestone 21: Final Type & Docs Polish

## Goals
Close the two remaining partial gaps to reach full compliance across all gap files.

## Tasks
1. Fix `AgenticConfig.apiKey` to be optional when `provider='custom'` (PRD partial gap)
2. Fix README `AgenticResult.images` type annotation from optional to required (DBB partial gap)

## Acceptance Criteria
- `AgenticConfig.apiKey` is typed as `string | undefined` or optional (`apiKey?`) in `types.ts`
- Custom provider callers no longer need to pass a dummy `apiKey`
- README shows `images: string[]` (required, not optional)
- All existing tests pass
