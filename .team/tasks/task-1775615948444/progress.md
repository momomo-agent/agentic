# Progress — Update ARCHITECTURE.md for agentic-core structure

## What was done

1. **Verified dependency completion**: task-1775613090477 (refactoring ask.ts to use agentic-core) is done — agentic-core package exists at `packages/agentic-core/` with loop.ts, types.ts, and providers/

2. **Verified code structure** against design:
   - `packages/agentic-core/src/`: loop.ts, types.ts, providers/ (anthropic.ts, openai.ts, index.ts) ✓
   - `src/ask.ts`: 79 lines, imports `agenticAsk` from agentic-core ✓
   - `src/tools/`: code.ts, file.ts, search.ts, shell.ts, index.ts ✓

3. **Checked for duplicate CRs**: All 12 existing CRs are resolved. No pending CR about ARCHITECTURE.md.

4. **Created CR**: cr-1775627079958
   - Proposes full ARCHITECTURE.md rewrite with agentic-core/agentic-lite split
   - Includes: Module Structure, Data Flow, Dependencies, Key Interfaces, Provider Resolution
   - Removes duplicate/instructional content from lines 55-73 of current file

## Why CR instead of direct edit

Per task instructions: "You must NOT write to ARCHITECTURE.md". The design specifies step 7 as "Submit as CR". Since I cannot directly edit ARCHITECTURE.md, I created a change request with the full proposed content for tech_lead/architect to review and apply.

## Notes

- The design mentions `provider.ts` for custom provider support in agentic-core, but the actual agentic-core has this handled via `index.ts` (createProvider factory). The CR content reflects actual code structure.
- `src/providers/` directory still exists in agentic-lite with old files (anthropic.ts, openai.ts, provider.ts) but they are no longer imported — ask.ts imports directly from agentic-core.
