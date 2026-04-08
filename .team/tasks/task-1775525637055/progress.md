# 修复 agent loop 支持多轮工具调用

## Progress

Verified implementation — no code changes needed.

- Loop correctly iterates until `stopReason !== 'tool_use'`
- Anthropic `rawContent` preserved for assistant turn replay
- Both providers correctly map stop reasons and message formats
