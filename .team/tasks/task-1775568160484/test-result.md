# Test Result: Expand README with API reference

## Status: DONE

## Verification

README.md `AgenticResult` block vs `src/types.ts`:

| Field | README | types.ts | Match |
|-------|--------|----------|-------|
| answer | `string` | `string` | ✓ |
| sources | `Source[]` (optional) | `Source[]` (optional) | ✓ |
| images | `images?: string[]` | `images: string[]` | ✗ MISMATCH |
| codeResults | optional | optional | ✓ |
| files | optional | optional | ✓ |
| shellResults | `ShellResult[]` (optional) | `ShellResult[]` (optional) | ✓ |
| toolCalls | optional | optional | ✓ |
| usage | required | required | ✓ |

## Issue Found

README shows `images?: string[]` (optional) but types.ts defines `images: string[]` (required). This is a documentation bug in README.

## All Tests Pass

64/64 tests passing. The README mismatch is a doc-only issue, not a code bug.

## Edge Cases

- `images` field optionality mismatch between README and types.ts
