# Vision — agentic-filesystem

跨环境统一虚拟文件系统。一套接口，三种 backend：
- 浏览器：IndexedDB (AgenticStoreBackend) / OPFS (OPFSBackend)
- Node/Electron：真实文件系统 (NodeFsBackend)

AI agent 通过 file_read/file_write 工具操作文件，不感知底层环境差异。
