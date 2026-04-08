# Technical Design — Trim ask.ts to ≤99 lines

## File to Modify
- `src/ask.ts` (currently 115 lines)

## Changes

### 1. Remove the `Accumulators` interface (lines 51-58)
Delete the named interface. Inline its shape directly into `handleToolCall`'s third parameter as an anonymous object type:

```ts
async function handleToolCall(
  tc: ProviderToolCall,
  config: AgenticConfig,
  acc: {
    allSources: Source[]
    allCodeResults: CodeResult[]
    allFileResults: FileResult[]
    allShellResults: ShellResult[]
    allToolCalls: ToolCall[]
    allImages: string[]
  },
): Promise<string> {
```

This saves ~6 lines (interface declaration + blank lines around it).

### 2. Compress the return block (lines 37-46)
Remove blank lines inside the return object if any, or compress the accumulator-to-result mapping. The current code has no blank lines here, so no savings here.

### 3. Remove unnecessary blank lines
- Remove blank line between imports (if any)
- Remove blank line before `// --- Tool execution ---` comment (line 49)
- Remove the section comment `// --- Tool execution ---` itself (saves 2 lines)

### 4. Resulting line count estimate
- Current: 115 lines
- Remove Accumulators interface: -6 lines
- Remove section comment + surrounding blank lines: -2 lines
- **Estimated new count: ~107 lines** — still over target

### 5. If still over 99: compress `ask()` return
Merge the return statement to fewer lines using a single-expression object:
```ts
return {
  answer: result.answer,
  sources: allSources.length > 0 ? allSources : undefined,
  images: allImages,
  codeResults: allCodeResults.length > 0 ? allCodeResults : undefined,
  files: allFileResults.length > 0 ? allFileResults : undefined,
  shellResults: allShellResults.length > 0 ? allShellResults : undefined,
  toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
  usage: result.usage,
}
```
This is already compact. Alternative: combine accumulator init onto fewer lines:
```ts
const allSources: Source[] = [], allCodeResults: CodeResult[] = [],
  allFileResults: FileResult[] = [], allShellResults: ShellResult[] = [],
  allToolCalls: ToolCall[] = [], allImages: string[] = []
```
Saves ~3 lines.

## Constraints
- ALL existing functionality must remain identical
- All 174 existing tests must pass unchanged
- No changes to public API surface
- No changes to any other files

## Verification
1. `wc -l src/ask.ts` must report ≤99
2. `npx vitest run` — all 174 tests pass
3. No new imports or exports added
