# Test Result — Expand README with API docs and usage examples

## Summary
- Total: 6
- Passed: 6
- Failed: 0

## Results
- PASS DBB-001: `npm install agentic-lite` present in README.md
- PASS DBB-002: Code block with `ask(` and `provider` present
- PASS DBB-003: `ask`, `prompt`, `config`, `AgenticResult` all present
- PASS DBB-004: All AgenticConfig fields present (provider, apiKey, model, baseUrl, customProvider, systemPrompt, tools, filesystem, toolConfig)
- PASS DBB-005: All AgenticResult fields present (answer, sources, images, codeResults, files, shellResults, toolCalls, usage)
- PASS DBB-006: All tool names present (code_exec, shell_exec, file_read, file_write, search)

## Edge Cases
- No duplicate sections found
- Existing quick start preserved and correct
