# M10 DBB — API修复 + 硬件自适应 + 安装完善

## DBB-001: sense.js detect(frame) API
- `detect(frame)` 返回 `{ faces: [], gestures: [], objects: [] }`
- 同步调用不抛出异常
- 现有事件接口 `on(type, handler)` 仍正常工作

## DBB-002: memory.js 并发写安全
- 并发 10 次 `add()` 后 INDEX_KEY 包含全部 10 条记录
- 无数据丢失，无重复条目

## DBB-003: llm.js 硬件自适应
- `loadConfig()` 调用 `optimizer.js` 而非硬编码 `gemma4:26b`
- 不同硬件 profile 返回不同模型名

## DBB-004: install/setup.sh
- `bash install/setup.sh` 在无 Node.js 环境下提示安装
- 有 Node.js 时完成 `npm install` 并启动服务
- 脚本幂等，重复执行无副作用

## DBB-005: config 热更新
- 远程 profiles 变更后 ≤60s 内配置自动重载
- 重载期间服务不中断，现有请求正常完成
