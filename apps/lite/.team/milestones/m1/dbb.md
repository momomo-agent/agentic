# M1 DBB - Core Agentic Loop & Correctness

## DBB-001: Multi-round tool loop continues until completion
- Requirement: Fix multi-round agent loop (task-1775525637055)
- Given: ask() is called with a prompt that requires 2+ sequential tool calls to complete
- Expect: ask() does NOT stop after the first tool round; it continues calling tools until the model returns a non-tool_use stop reason
- Verify: The final AgenticResult contains a text response (not a tool_use stop), and all intermediate tool results are reflected in the conversation

## DBB-002: Multi-round loop respects MAX_TOOL_ROUNDS
- Requirement: Fix multi-round agent loop (task-1775525637055)
- Given: ask() is called and the model keeps requesting tools beyond MAX_TOOL_ROUNDS
- Expect: ask() stops after MAX_TOOL_ROUNDS and returns whatever result is available (no infinite loop)
- Verify: The call terminates; no hang or crash

## DBB-003: images field populated from tool results
- Requirement: Fix images field silent loss (task-1775525744093)
- Given: A tool returns an image in its result during a tool round
- Expect: AgenticResult.images contains that image
- Verify: AgenticResult.images is non-empty and contains the image data returned by the tool

## DBB-004: images field empty when no tool returns images
- Requirement: Fix images field silent loss (task-1775525744093)
- Given: ask() completes with no tool returning images
- Expect: AgenticResult.images is an empty array (not undefined/null)
- Verify: typeof result.images === 'object' && result.images.length === 0

## DBB-005: ask() accepts optional systemPrompt
- Requirement: Add system prompt support (task-1775525748440)
- Given: ask() is called with a systemPrompt string
- Expect: The model receives the system prompt and its response reflects it (e.g., language, persona, constraints)
- Verify: Calling ask() with systemPrompt does not throw; response is shaped by the prompt

## DBB-006: ask() works without systemPrompt
- Requirement: Add system prompt support (task-1775525748440)
- Given: ask() is called without a systemPrompt parameter
- Expect: ask() completes normally with no error
- Verify: AgenticResult is returned successfully

## DBB-007: file_read and file_write work in browser environment
- Requirement: Replace file tool with agentic-filesystem (task-1775525637091)
- Given: file_write is called with a path and content, then file_read is called with the same path
- Expect: file_read returns the exact content written by file_write
- Verify: No Node.js-specific errors; works in a browser JS environment (no `fs` module dependency)

## DBB-008: file_read on non-existent file returns error
- Requirement: Replace file tool with agentic-filesystem (task-1775525637091)
- Given: file_read is called with a path that has never been written
- Expect: Returns an error result (not a crash); error message indicates file not found
- Verify: ask() does not throw; tool result contains an error description

## DBB-009: code_exec runs JavaScript and captures console output
- Requirement: Replace code tool with browser-compatible impl (task-1775525637125)
- Given: code_exec is called with `console.log("hello")`
- Expect: Result contains "hello" in the output
- Verify: Output string includes the logged value; no Node.js dependency errors

## DBB-010: code_exec supports async code
- Requirement: Replace code tool with browser-compatible impl (task-1775525637125)
- Given: code_exec is called with async code (e.g., `await Promise.resolve(42)`)
- Expect: Executes without error and returns the result
- Verify: No "await is only valid in async function" error; result is returned

## DBB-011: code_exec captures runtime errors
- Requirement: Replace code tool with browser-compatible impl (task-1775525637125)
- Given: code_exec is called with code that throws (e.g., `throw new Error("oops")`)
- Expect: Returns an error result containing the error message
- Verify: ask() does not crash; tool result contains "oops"

## DBB-012: End-to-end agentic task: write → read → exec
- Requirement: PRD acceptance criteria
- Given: ask() is called with a prompt instructing the AI to write a file, read it back, and execute code using its content
- Expect: AI completes all three tool calls in sequence and returns a coherent final answer
- Verify: AgenticResult has text output; no errors thrown during the multi-tool sequence

## DBB-013: Custom provider can be passed to ask()
- Requirement: Implement custom provider support (task-1775525816399)
- Given: ask() is called with a custom provider object (not the default)
- Expect: ask() uses the custom provider for model calls; no error about unknown provider
- Verify: AgenticResult is returned; the custom provider's call method was invoked
