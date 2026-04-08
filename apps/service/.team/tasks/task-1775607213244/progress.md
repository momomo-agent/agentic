# Review and merge Architecture CRs + document agentic-embed

## Changes Made

### CR Updates
1. **cr-1775579949939**: status pending → reviewed, set reviewedAt/reviewedBy
   - Requested tunnel, CLI, HTTPS, VAD, agentic-embed docs — sections 5-8 already present, agentic-embed handled via new CR
2. **cr-1775580105000**: status pending → reviewed, set reviewedAt/reviewedBy
   - Same scope as above, both CRs resolved

### New CR Created
3. **cr-1775609587772**: New CR requesting agentic-embed section in ARCHITECTURE.md
   - Documents `src/runtime/embed.js` → `embed(text) → number[]`
   - Notes bge-m3 vector embedding, TypeError on invalid input, empty array for empty string
   - References memory.js as consumer for semantic search

## Notes
- Sections 5-8 (Tunnel, CLI, VAD, HTTPS/Middleware) were already documented in ARCHITECTURE.md
- agentic-embed is mentioned in dependency tree and memory.js docs but lacks a dedicated section
- New CR will be reviewed by L1 for the actual ARCHITECTURE.md edit
