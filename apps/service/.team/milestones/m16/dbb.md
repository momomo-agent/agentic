# M16 DBB - 测试覆盖率 + SIGINT + CDN + 多设备会话

## DBB-001: 测试覆盖率 ≥98%
- Requirement: M16-REQ-1
- Given: 运行 `npm test -- --coverage`
- Expect: 覆盖率报告显示 statements/lines/branches/functions 均 ≥98%
- Verify: 命令退出码为 0，控制台输出覆盖率数值 ≥98%

## DBB-002: 覆盖率不足时失败
- Requirement: M16-REQ-1
- Given: 删除部分测试后运行 `npm test -- --coverage`
- Expect: 覆盖率低于阈值时命令退出码非 0
- Verify: 输出包含覆盖率不足的错误提示

## DBB-003: SIGINT 优雅关闭 - 服务正常退出
- Requirement: M16-REQ-2
- Given: 启动服务后向进程发送 SIGINT 信号（Ctrl+C）
- Expect: 服务在收到信号后完成当前请求并退出，退出码为 0
- Verify: 进程不再监听端口，无僵尸进程残留

## DBB-004: SIGINT 期间无请求丢失
- Requirement: M16-REQ-2
- Given: 服务处理请求时发送 SIGINT
- Expect: 正在处理的请求完成后服务才退出
- Verify: 请求返回正常响应，服务随后退出

## DBB-005: CDN URL 为 cdn.example.com
- Requirement: M16-REQ-3
- Given: 查看 profiles.js 中的 CDN 配置
- Expect: 所有 CDN URL 使用 cdn.example.com，不含 jsdelivr.net
- Verify: 前端资源加载请求指向 cdn.example.com

## DBB-006: 无 jsdelivr.net 引用
- Requirement: M16-REQ-3
- Given: 搜索项目中所有 jsdelivr.net 引用
- Expect: 零个匹配结果
- Verify: `grep -r "jsdelivr.net" src/` 无输出

## DBB-007: 多设备 sessionId 广播
- Requirement: M16-REQ-4
- Given: 设备 A 创建会话，设备 B 连接同一 hub
- Expect: 设备 B 收到设备 A 的 sessionId 广播消息
- Verify: 设备 B 的事件日志包含来自设备 A 的 sessionId

## DBB-008: 跨设备会话共享
- Requirement: M16-REQ-4
- Given: 设备 A 在会话中存储状态，设备 B 使用相同 sessionId 连接
- Expect: 设备 B 能读取设备 A 存储的会话状态
- Verify: 设备 B 返回的会话数据与设备 A 写入的一致

## DBB-009: 单设备时无广播异常
- Requirement: M16-REQ-4
- Given: 只有一个设备连接 hub
- Expect: 系统正常运行，无广播相关错误
- Verify: 日志无 sessionId 广播错误，服务响应正常
