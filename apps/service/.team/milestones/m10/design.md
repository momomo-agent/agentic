# M10 Technical Design — API修复 + 硬件自适应 + 安装完善

## 目标
修复5个已知缺陷：sense API、memory并发、llm硬件自适应、安装脚本、config热更新。

## 涉及文件
- `src/runtime/sense.js` — 添加 `detect(frame)` 导出
- `src/runtime/memory.js` — 添加 mutex 保护 `add()`
- `src/runtime/llm.js` — `loadConfig()` 调用 optimizer
- `install/setup.sh` — 新建安装脚本
- `src/runtime/profiles.js` 或 `src/detector/profiles.js` — 添加轮询热更新

## 关键设计决策
- mutex 用简单 Promise 链实现，无需外部依赖
- 热更新用 `setInterval` 轮询远程 profiles，间隔 30s
- setup.sh 用 POSIX sh，不依赖 bash 特性
