# Vision

agentic-lite 是 agentic 家族的集成演示层。

目标：让 AI 以为自己在操作一台电脑——能读写文件、执行代码、跑 shell 命令——但实际运行在浏览器或 Node.js 里。

## 架构

agentic-lite = agentic-core（LLM loop）+ agentic-filesystem（文件系统）+ agentic-shell（shell 命令）

- **agentic-core**：负责 LLM 调用、agent loop、tool schema、streaming
- **agentic-filesystem**：file_read / file_write tool 的底层存储（浏览器 IndexedDB / Node.js fs）
- **agentic-shell**：shell_exec tool 的底层执行（虚拟 shell，14 个命令）
- **agentic-lite**：把三者组合，暴露简单的 `ask()` API，注入"你在一台电脑上"的 system prompt

## 核心能力

- file_read / file_write：通过 agentic-filesystem 操作虚拟文件系统
- code_exec：在沙箱里执行 JavaScript（浏览器 AsyncFunction / Node quickjs）
- shell_exec：通过 agentic-shell 执行 shell 命令
- 真正的多轮 agent loop：AI 可以连续调用工具直到任务完成

## 设计原则

- agentic-lite 自身代码要薄（ask.ts < 100 行）
- provider 层、agent loop、streaming 全部委托给 agentic-core
- tool 实现委托给 agentic-filesystem 和 agentic-shell
- 浏览器兼容：无 Node.js 静态依赖
