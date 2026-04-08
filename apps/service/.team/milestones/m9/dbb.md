# M9 DBB - DBB 规范修复 + 一键安装完善

## DBB-001: tool_use 响应格式正确
- Given: LLM 返回 tool_use 结果
- Expect: 响应体使用 text 字段而非 content 字段
- Verify: POST /api/chat 含工具调用，响应 JSON 有 text 字段

## DBB-002: store.js delete() 方法可用
- Given: 调用 store.delete(key)
- Expect: 成功删除键值，无 TypeError
- Verify: store.set('k','v'); store.delete('k'); store.get('k') === undefined

## DBB-003: CDN URL 可访问
- Given: 首次启动拉取 profiles.json
- Expect: 使用正确 CDN URL，返回有效 JSON
- Verify: HTTP 200，profiles 数组非空

## DBB-004: SIGINT 优雅关闭
- Given: 服务运行中，用户按 Ctrl+C
- Expect: 服务正常退出，无 unhandled rejection，exit code 0
- Verify: process 收到 SIGINT 后 server.close() 被调用，进程退出

## DBB-005: npx 一键安装 - Ollama 检查
- Given: 运行 npx agentic-service，Ollama 未安装
- Expect: 提示安装 Ollama 并给出安装命令
- Verify: 控制台输出安装提示，进程等待或退出

## DBB-006: npx 一键安装 - 模型拉取进度
- Given: Ollama 已安装，推荐模型未下载
- Expect: 显示拉取进度百分比
- Verify: 控制台输出 "Pulling model... XX%" 格式进度

## DBB-007: npx 一键安装 - 启动后打开浏览器
- Given: 服务启动成功
- Expect: 自动打开 http://localhost:3000
- Verify: open/xdg-open/start 被调用，URL 为 http://localhost:3000
