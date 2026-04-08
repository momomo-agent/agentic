# Task Design: brain.js tool_use text字段

## 文件
- `src/server/brain.js`

## 现状分析
代码已正确实现：
- Ollama 路径（第40行）：`yield { type: 'tool_use', ..., text: '' }`
- OpenAI 路径（第84行）：`yield { type: 'tool_use', ..., text: '' }`

## 结论
**无需修改**。DBB-007 验证条件已满足，`text` 字段已存在。

## 验证方式
- 触发 tool_use 响应
- 检查 yield 对象包含 `text` 字段（值为空字符串）
