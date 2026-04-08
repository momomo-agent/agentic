# Milestone 4: Agentic Loop Correctness & System Prompt

## Goals
Fix the broken multi-round tool loop, recover lost images field, add system prompt support, and implement custom provider hook.

## Scope
- Fix ask.ts multi-round tool loop (up to MAX_TOOL_ROUNDS)
- Fix images field lost in final-response branch (ask.ts:68)
- Add systemPrompt field to AgenticConfig
- Implement custom provider hook in createProvider()

## Acceptance Criteria
- Tool loop continues for multiple rounds until no tools called or MAX_TOOL_ROUNDS reached
- AgenticResult.images populated correctly in all code paths
- systemPrompt passed to provider messages
- createProvider() throws or calls custom hook for provider='custom'

## Status: planned
