# Task Design — Fix README AgenticResult.images type annotation

## File to Modify
- `README.md`

## Change
Find `images?: string[]` in the `AgenticResult` documentation and change to `images: string[]`.

## Approach
1. Search README for `images?:` 
2. Replace with `images:` (remove the `?`)
3. Confirm no remaining `images?:` occurrences

## Edge Cases
- Multiple occurrences: fix all of them
- Table vs code-block format: remove `?` in whichever format is used

## Test Cases
- README must not contain `images?:` after the fix
- All existing tests pass
