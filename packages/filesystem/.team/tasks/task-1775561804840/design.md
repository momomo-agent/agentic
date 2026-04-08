# Task Design: Fix README custom storage scan() signature example

## Objective
Update the custom storage example in README.md to show the correct scan() return type with the `line` field.

## Files to Modify
- `README.md` (line 147)

## Current State
```typescript
async scan(pattern: string): Promise<Array<{ path: string; content: string }>> { /* ... */ }
```

## Target State
```typescript
async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> { /* ... */ }
```

## Implementation Details

### Change Required
Update line 147 in README.md to include the `line` field in the scan() return type.

**Old signature:**
```typescript
async scan(pattern: string): Promise<Array<{ path: string; content: string }>> { /* ... */ }
```

**New signature:**
```typescript
async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> { /* ... */ }
```

## Rationale
The scan() method was updated to return line numbers for each match, making it consistent with grep-like behavior. The StorageBackend interface definition and all concrete implementations (NodeFsBackend, OPFSBackend, AgenticStoreBackend) already use this signature. The README example needs to match.

## Verification
1. Check that line 147 in README.md matches the StorageBackend interface
2. Verify the example compiles if a user copies it
3. Confirm consistency with other backend implementations in the codebase

## Edge Cases
None - this is a pure documentation fix with no runtime behavior changes.

## Dependencies
None - standalone documentation update.

## Testing
No automated tests needed. Manual verification:
- Read the updated README section
- Compare with `src/types.ts` StorageBackend interface definition
- Ensure the example is accurate and complete
