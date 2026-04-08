# M19 DBB - CDN配置 + 性能验证 + 安全访问

## DBB-001: CDN URL 非占位符
- Requirement: REQ-M19-1 (profiles.js CDN URL修复)
- Given: 服务启动，profiles.js 加载远程配置
- Expect: 请求的 URL 不包含 `cdn.example.com`，为真实 CDN 地址或环境变量配置值
- Verify: 检查网络请求或日志，确认无占位符域名

## DBB-002: CDN fallback 到 default.json
- Requirement: REQ-M19-1
- Given: CDN URL 不可达（网络断开或返回非200）
- Expect: 服务不崩溃，自动使用本地 default.json 配置
- Verify: 断网启动服务，服务正常运行，日志显示 fallback 路径

## DBB-003: CDN URL 可通过环境变量配置
- Requirement: REQ-M19-1
- Given: 设置环境变量（如 `PROFILES_CDN_URL=https://...`）后启动
- Expect: profiles.js 使用该环境变量值而非硬编码 URL
- Verify: 设置不同 URL，观察请求目标变化

## DBB-004: 延迟基准测试脚本存在且可执行
- Requirement: REQ-M19-2 (语音端到端延迟验证)
- Given: 运行延迟基准测试脚本
- Expect: 脚本执行成功（exit code 0），输出包含 STT、LLM、TTS 各阶段耗时（毫秒）
- Verify: `node scripts/benchmark.js`（或等效命令）输出三段耗时数据

## DBB-005: 端到端语音延迟 < 2s
- Requirement: REQ-M19-2
- Given: 在目标硬件（M4 Mac 或同等配置）上运行基准测试
- Expect: STT + LLM + TTS 全链路总延迟 < 2000ms
- Verify: 基准测试脚本输出的 total latency < 2000ms

## DBB-006: HTTPS 启动选项
- Requirement: REQ-M19-3 (LAN HTTPS访问)
- Given: 使用 `--https` flag 或设置对应环境变量启动服务
- Expect: 服务监听 HTTPS，浏览器通过 `https://localhost:<port>` 可访问
- Verify: `curl -k https://localhost:<port>/health` 返回 200

## DBB-007: 无 HTTPS flag 时默认 HTTP
- Requirement: REQ-M19-3
- Given: 不传 `--https` flag，正常启动服务
- Expect: 服务仍以 HTTP 正常启动，行为与之前一致
- Verify: `curl http://localhost:<port>/health` 返回 200
