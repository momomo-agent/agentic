# Task Design: Clean ARCHITECTURE.md of Leftover Task Instructions and Fix Accuracy Gaps

## Scope

Documentation-only task — no source code changes. Edit `ARCHITECTURE.md` to remove non-architecture content and fix 5 verified inaccuracies.

## File to Modify

- `ARCHITECTURE.md` (project root)

## Changes

### Change 1: Remove leftover task instructions (lines 55-75)

**Problem**: Lines 55-75 contain task-style instructions ("Add a 'Custom Provider Fallback' subsection...", "Create ARCHITECTURE.md defining...", "In the 'Provider Resolution...' section, add...") that are not architecture documentation.

**Action**: Delete lines 55-75 entirely. These are leftover meta-instructions from previous tasks, not architecture content.

### Change 2: Fix Provider/ToolDefinition location (line 40)

**Problem**: "Key Interfaces" section references `AgenticConfig`, `AgenticResult`, `Provider`, `ToolDefinition` without specifying where they live. The Module Structure section implies `src/types.ts` owns all types, but `Provider` and `ToolDefinition` are defined in `packages/agentic-core/src/types.ts`.

**Action**: Update the Key Interfaces section to clarify:
- `AgenticConfig`, `AgenticResult` — defined in `src/types.ts` (agentic-lite)
- `Provider`, `ToolDefinition` — defined in `packages/agentic-core/src/types.ts`

Update the Module Structure section to note that `src/types.ts` re-exports `Provider` from `agentic-core`, and remove any implication that providers live under `src/providers/`.

### Change 3: Fix Module Structure for providers (lines 9-15)

**Problem**: Lists `src/providers/anthropic.ts`, `src/providers/openai.ts`, `src/providers/provider.ts`, `src/providers/index.ts`. This directory does not exist.

**Action**: Replace `src/providers/` block with:
```
- `src/types.ts` — agentic-lite config/result types (re-exports Provider from agentic-core)
- `src/tools/` — tool definitions and execution functions (barrel export)
```

Add a separate section for the `agentic-core` package:
```
- `packages/agentic-core/src/types.ts` — Provider, ToolDefinition, AgentLoopConfig interfaces
- `packages/agentic-core/src/providers/` — anthropic.ts, openai.ts, index.ts (createProvider factory)
- `packages/agentic-core/src/loop.ts` — runAgentLoop(), runAgentLoopStream()
```

### Change 4: Fix createOpenAIProvider signature (Provider Resolution section)

**Problem**: Line 73 references `createOpenAIProvider(baseUrl, apiKey, model)` with three separate arguments. Actual signature is `createOpenAIProvider(config: ProviderConfig)` accepting a single config object.

**Action**: Change the fallback reference from:
```
createOpenAIProvider(baseUrl, apiKey, model)
```
to:
```
createOpenAIProvider({ baseUrl, apiKey, model })
```

### Change 5: Fix tools/index.ts description (line 14)

**Problem**: Describes `src/tools/index.ts` as "tool registry". It is actually a barrel export file.

**Action**: Change `tool registry` to `barrel export of tool definitions and execution functions`.

### Change 6: Add toolConfig to AgenticConfig fields (line 40)

**Problem**: Lists `AgenticConfig` fields as "(provider, apiKey, model, tools, systemPrompt, filesystem)" — missing `toolConfig` and `baseUrl`.

**Action**: Update to: "(provider, apiKey, model, tools, systemPrompt, filesystem, toolConfig, baseUrl, customProvider)"

## Verification

- Read the updated ARCHITECTURE.md and confirm all 6 changes are applied
- Confirm no task-style instructions remain (no lines starting with "Add", "Create", "Fix", "In the... section" as meta-directives)
- Confirm provider/module structure matches actual filesystem
- Confirm `createOpenAIProvider` call example uses config object pattern
- Confirm `toolConfig` appears in AgenticConfig fields list
- Run architecture match scorer to verify improvement toward ≥95%
