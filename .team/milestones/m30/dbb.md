# M30 DBB - VAD + CDN真实端点 + HTTPS + 多设备脑状态共享

## DBB-001: VAD自动检测语音开始
- Requirement: VAD自动检测（PRD M2: Web UI语音 — VAD自动检测）
- Given: 用户打开Web UI，不按任何按键，对着麦克风说话
- Expect: 系统自动检测到语音活动，开始录音，UI显示"录音中"状态
- Verify: 无需手动按键，语音输入被捕获并发送到STT

## DBB-002: VAD自动检测语音结束
- Requirement: VAD自动检测
- Given: 用户说完话后停止说话（静音超过阈值）
- Expect: 系统自动停止录音，触发STT处理
- Verify: 静音后1-2秒内自动提交语音，无需用户手动操作

## DBB-003: VAD静音不误触发
- Requirement: VAD自动检测
- Given: 环境有背景噪音但用户未说话
- Expect: 系统不误触发录音
- Verify: 无意外的STT请求被发送

## DBB-004: CDN端点非占位符
- Requirement: CDN真实端点（profiles.js使用真实CDN URL或可配置环境变量）
- Given: 服务启动，profiles.js被加载
- Expect: CDN URL不包含 `cdn.example.com` 或任何占位符字符串
- Verify: profiles拉取请求指向真实可访问的URL，或通过环境变量配置

## DBB-005: CDN端点可通过环境变量配置
- Requirement: CDN真实端点
- Given: 设置环境变量 `CDN_URL=https://custom.example/profiles.json`，启动服务
- Expect: profiles从该自定义URL拉取
- Verify: 网络请求日志显示请求发往配置的URL

## DBB-006: CDN不可达时降级使用本地缓存
- Requirement: CDN真实端点
- Given: CDN URL不可访问
- Expect: 服务使用本地缓存的profiles，不崩溃
- Verify: 服务正常启动，日志显示使用本地缓存

## DBB-007: HTTPS证书自动生成
- Requirement: HTTPS/LAN安全访问
- Given: 首次启动服务，无已有证书
- Expect: 自动生成自签名证书，服务通过HTTPS提供访问
- Verify: `https://localhost:<port>` 可访问（浏览器提示证书警告但连接建立）

## DBB-008: LAN设备可通过HTTPS访问
- Requirement: HTTPS/LAN安全访问
- Given: 同一局域网内的另一设备访问 `https://<host-ip>:<port>`
- Expect: 连接成功，Web UI可加载，WebSocket通过WSS建立
- Verify: 局域网设备能正常使用服务

## DBB-009: 多设备共享LLM上下文
- Requirement: 多设备脑状态共享（多设备会话共享LLM上下文，history同步）
- Given: 设备A发送"我叫小明"，设备B随后发送"我叫什么名字？"
- Expect: 设备B收到包含"小明"的回复
- Verify: LLM history在两个设备间同步

## DBB-010: 新设备加入时同步现有上下文
- Requirement: 多设备脑状态共享
- Given: 设备A已有对话历史，设备B新连接
- Expect: 设备B连接后发送消息，AI回复体现已有对话上下文
- Verify: 设备B无需重放历史即可感知已有会话

## DBB-011: 设备断线重连后上下文保持
- Requirement: 多设备脑状态共享
- Given: 设备A断开WebSocket后重新连接
- Expect: 重连后对话上下文仍然有效
- Verify: 重连后发送消息，AI回复体现之前的对话历史
