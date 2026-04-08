# M28 DBB — Streaming & Timeout Enforcement

## DBB-001: Provider interface has stream() method
- Requirement: agentic-core `Provider` interface includes a `stream()` method alongside existing `chat()`
- Given: `packages/agentic-core/src/types.ts` is inspected
- Expect: `Provider` interface declares `stream()` that returns an `AsyncGenerator<StreamChunk>`
- Verify: TypeScript compiles; `Provider` interface contains both `chat()` and `stream()` methods

## DBB-002: Anthropic provider implements stream()
- Requirement: `createAnthropicProvider` returns a Provider with working `stream()` implementation
- Given: Anthropic provider is called with `stream: true` body, SSE response is parsed chunk-by-chunk
- Expect: `stream()` yields `StreamChunk` objects with `{type, text?, toolCall?}` as events arrive
- Verify: Unit test with mocked SSE response confirms chunks are yielded incrementally

## DBB-003: OpenAI provider implements stream()
- Requirement: `createOpenAIProvider` returns a Provider with working `stream()` implementation
- Given: OpenAI provider is called with `stream: true` body, SSE response is parsed chunk-by-chunk
- Expect: `stream()` yields `StreamChunk` objects as SSE events arrive
- Verify: Unit test with mocked SSE response confirms chunks are yielded incrementally

## DBB-004: runAgentLoopStream() exists in agentic-core
- Requirement: agentic-core exports `runAgentLoopStream()` that yields chunks from the agent loop in real-time
- Given: `packages/agentic-core/src/loop.ts` is inspected
- Expect: `runAgentLoopStream()` is exported; accepts same `AgentLoopConfig` as `runAgentLoop()`; returns `AsyncGenerator<AgentStreamChunk>`
- Verify: Function signature compiles; calling it returns an async generator

## DBB-005: agentic-lite exposes askStream()
- Requirement: `src/ask.ts` exports `askStream()` that delegates to `runAgentLoopStream()`
- Given: `src/ask.ts` is inspected for streaming export
- Expect: `askStream()` function exists; returns `AsyncGenerator` yielding partial results
- Verify: TypeScript compiles; consumer can iterate over streaming response

## DBB-006: Streaming maintains backward compatibility
- Requirement: Existing `ask()` API is unchanged — all existing tests pass without modification
- Given: Existing test suite is run after streaming changes
- Expect: All 174+ tests pass; `ask()` behavior is identical for non-streaming callers
- Verify: `npm test` exits with code 0, all tests passing

## DBB-007: code timeout is enforced in executeCode
- Requirement: `toolConfig.code.timeout` is wired into `executeCode()` and actually enforced
- Given: `executeCode()` is called with `timeout: 1000` and an infinite loop (`while(true){}`)
- Expect: Function rejects with a descriptive timeout error after ~1000ms, not hanging indefinitely
- Verify: Unit test with `while(true){}` and timeout=500 completes in < 2000ms with error

## DBB-008: Timeout works across all execution paths
- Requirement: Timeout enforcement works for QuickJS (browser), Pyodide (browser), and python3 (Node)
- Given: Each execution path is tested with an infinite-loop code snippet and a timeout
- Expect: All three paths reject with timeout error within bounded time
- Verify: Three separate tests — one per execution path — all pass

## DBB-009: ARCHITECTURE.md documents streaming API
- Requirement: ARCHITECTURE.md is updated with streaming interface, Provider.stream(), runAgentLoopStream(), and askStream()
- Given: ARCHITECTURE.md is read
- Expect: Streaming section exists with function signatures and data flow diagram
- Verify: `grep -c "stream\|Stream" ARCHITECTURE.md` returns >= 5 matches in relevant sections

## DBB-010: Vision gap closes to ≥90%
- Requirement: Streaming + timeout enforcement satisfy remaining vision gaps
- Given: Vision score is recalculated after implementation
- Expect: Vision compliance score is ≥90%
- Verify: Monitor/gap analysis reports vision score ≥90%
