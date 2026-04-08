# M5 DBB - Test Coverage & Integration Verification

## DBB-001: All tests pass
- Requirement: All 25+ tests pass (0 failures)
- Given: Run the full test suite
- Expect: 0 failing tests, 25+ tests total pass
- Verify: Test runner exits with code 0, output shows no failures

## DBB-002: systemPrompt passed through multiple tool rounds
- Requirement: systemPrompt multi-round test added and passing
- Given: `ask()` is called with a `systemPrompt` and the agent executes at least 2 tool rounds before stopping
- Expect: The `system` field is present in every provider call across all rounds
- Verify: A test exists that asserts systemPrompt is forwarded on round 1, round 2, and final round; test passes

## DBB-003: Test coverage >= 98%
- Requirement: Test coverage >= 98%
- Given: Run coverage report after full test suite
- Expect: Coverage output shows >= 98% (lines or statements)
- Verify: Coverage tool reports >= 98%; no uncovered critical paths

## DBB-004: Integration smoke test — full ask() with tools
- Requirement: Integration smoke test: full ask() call with tools enabled
- Given: `ask()` is called with a prompt that triggers at least one tool call, using a valid provider config
- Expect: Returns an `AgenticResult` with `answer` (non-empty string), `toolCalls` (non-empty array), exit code 0
- Verify: Test passes end-to-end without throwing; result shape matches `AgenticResult` spec

## DBB-005: Multi-round loop terminates correctly (EXPECTED_DBB alignment)
- Requirement: Agent loop terminates when stopReason !== 'tool_use'
- Given: LLM returns `stopReason = 'end_turn'` after tool rounds
- Expect: `ask()` returns without infinite loop; result is returned to caller
- Verify: Existing or new test confirms loop exits on non-tool_use stop reason
