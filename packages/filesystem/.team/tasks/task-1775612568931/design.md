# Task Design: Add performance comparison table to README

## Objective
Add a performance comparison section to `README.md` documenting relative speed, memory usage, and best-use-case for each backend.

## Files to Modify
- `README.md` — add performance comparison table section

## Implementation

### Table Location
Insert after the existing per-backend usage examples section, before the "Custom Backend" section.

### Table Content
```markdown
## Performance Comparison

| Backend | Relative Speed | Memory Usage | Storage Limit | Best For |
|---------|---------------|-------------|---------------|----------|
| Memory | Fastest | High (in-memory) | RAM | Testing, ephemeral sessions |
| NodeFs | Fast | Low (streaming) | Disk | Server-side, Electron |
| OPFS | Fast | Low (streaming) | Quota (~GB) | Browser apps |
| AgenticStore | Medium | Medium | Quota/Config | Browser (IndexedDB) |
| SQLite | Fast | Low (structured) | Disk | Structured persistent data |
| LocalStorage | Slow | High (sync) | ~5MB | Simple browser storage |
```

### Design Decisions
- Use qualitative terms (Fastest/Fast/Medium/Slow) rather than specific numbers — actual performance varies by environment
- "Memory Usage" describes the storage model, not measured heap
- "Storage Limit" is the practical upper bound
- "Best For" gives a one-line recommendation

### Data Sources
- ARCHITECTURE.md backend descriptions for accuracy
- Known browser API constraints (LocalStorage ~5MB, OPFS quota-based)
- Node.js fs/promises characteristics (streaming = low memory)

## Edge Cases
- If README already has a performance section, update it rather than duplicating
- Keep table consistent with ARCHITECTURE.md — do not introduce contradictory claims
- SQLite is optional peer dep — note this in the table or surrounding text if relevant

## Verification
- Grep for the table after writing: `grep "Performance Comparison" README.md`
- Verify all 6 backends are listed
- Verify no broken markdown formatting
