# M100 DBB — Runtime Safety: Fix Missing Adapter + Dead Code Cleanup

## DBB-001: No runtime error when kokoro provider is selected
- Requirement: P0 from overview — fix dangling kokoro adapter reference
- Given: The service is configured to use "kokoro" as the TTS provider
- Expect: The service either (a) successfully initializes the kokoro TTS adapter and can synthesize speech, or (b) gracefully handles the provider selection without throwing an unhandled import/require error
- Verify: Starting the service with kokoro selected does not crash; no uncaught exception or module-not-found error in logs

## DBB-002: TTS adapter map is consistent with adapter files on disk
- Requirement: P0 — no dangling references
- Given: The TTS runtime's adapter registry/map lists provider names and their corresponding adapter modules
- Expect: Every adapter referenced in the map has a corresponding file that exists and is importable
- Verify: Iterating over all entries in the adapter map and importing each one succeeds without errors

## DBB-003: Architecture gap scanner reports no "missing" status for this item
- Requirement: Acceptance criteria from overview
- Given: The architecture gap scanner is run against the codebase after the fix
- Expect: The kokoro adapter entry no longer appears as "missing" or "major" gap
- Verify: Gap scanner output does not contain a missing/major entry for the kokoro/TTS adapter reference

## DBB-004: Existing TTS providers still work after the change
- Requirement: Regression safety — PRD M2 TTS integration
- Given: The fix is applied (adapter created or reference removed)
- Expect: All previously working TTS providers (piper, openai-tts, elevenlabs, macos-say) continue to initialize and function correctly
- Verify: Existing TTS-related tests pass; selecting any other TTS provider does not produce errors

## DBB-005: All existing tests pass
- Requirement: Regression safety — PRD test section (962 tests, 951 passed)
- Given: The fix is applied to the codebase
- Expect: The full test suite runs with no new failures
- Verify: `vitest run` reports no regressions; pass count is equal to or greater than before the change

## DBB-006: Dead code adapters/embed.js is removed
- Requirement: P1 from overview — remove documented dead code
- Given: `src/runtime/adapters/embed.js` exists and throws 'not implemented' unconditionally
- Expect: The file is deleted and no source code or config references it
- Verify: `src/runtime/adapters/embed.js` does not exist on disk; `vitest.config.js` has no `#agentic-embed` alias; `grep -r 'adapters/embed' src/` returns no results

## DBB-007: vitest.config.js has no stale alias after dead code removal
- Requirement: Clean config — no references to deleted files
- Given: `vitest.config.js` previously aliased `#agentic-embed` to the dead adapter
- Expect: The alias is removed; vitest config still works for test execution
- Verify: `vitest.config.js` does not contain `#agentic-embed`; `vitest run` succeeds
