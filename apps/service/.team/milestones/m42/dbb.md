# M42 DBB - Admin UI + Detector清理 + VAD + README

## DBB-001: Admin 面板可访问
- Requirement: Admin panel at /admin
- Given: 服务运行后，浏览器访问 /admin
- Expect: 返回 HTTP 200，页面渲染 Admin UI
- Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/admin` 返回 200

## DBB-002: Admin 面板包含设备/模型/状态页
- Requirement: Admin panel with device/model/status pages
- Given: 访问 /admin
- Expect: 页面包含设备列表、模型配置、服务状态三个功能区域（或路由）
- Verify: UI 中可见设备、模型、状态相关内容

## DBB-003: GPU 检测通过 hardware.js 完成
- Requirement: hardware.js covers GPU detection (gpu-detector.js removed)
- Given: 服务启动时硬件检测阶段
- Expect: GPU 信息（类型/显存）被正确检测并输出到日志或 API 响应
- Verify: 启动日志或 `/api/status` 包含 GPU 相关字段

## DBB-004: gpu-detector.js 不再被引用
- Requirement: gpu-detector.js removed
- Given: 项目代码库
- Expect: 无任何文件 import/require gpu-detector.js
- Verify: 搜索代码库无 `gpu-detector` 引用

## DBB-005: VAD 在服务端自动检测语音活动
- Requirement: VAD detects voice activity on server side
- Given: 服务端接收音频流
- Expect: VAD 自动判断语音起止，无需客户端手动触发
- Verify: 发送含静音段的音频，服务端日志显示 VAD 检测到语音开始/结束事件

## DBB-006: VAD 静音不触发 LLM 推理
- Requirement: VAD detects voice activity on server side
- Given: 发送纯静音音频片段
- Expect: 不触发 STT 或 LLM 处理
- Verify: 服务端日志无 STT/LLM 调用记录

## DBB-007: README 包含 npx/Docker/API 使用说明
- Requirement: README covers npx, Docker, API usage
- Given: 项目根目录 README.md
- Expect: 包含 npx 启动、Docker 启动、REST API 示例三部分内容
- Verify: README.md 中可见 "npx"、"docker"、API 端点示例

## DBB-008: optimizer.js 根据硬件输出优化配置
- Requirement: src/detector/optimizer.js 硬件优化逻辑补全
- Given: 检测到不同硬件配置（Apple Silicon / NVIDIA / CPU-only）
- Expect: optimizer 返回对应的模型/量化推荐配置，不返回 null 或空对象
- Verify: 三种硬件场景下均有非空配置输出
