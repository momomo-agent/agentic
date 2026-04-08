# PRD — agentic-filesystem

## 目标
完善跨环境虚拟文件系统，确保三个 backend 行为一致。

## 当前状态
- ✓ 三个 backend：AgenticStoreBackend / OPFSBackend / NodeFsBackend
- ✓ 核心操作：get/set/delete/list/scan
- ✓ 目录识别：ls 能区分文件和目录
- ✓ grep 支持：全文搜索

## 待完善

### 1. Backend 一致性
- `list()` 在三个 backend 的路径格式统一（都带 `/` 前缀）
- `scan()` 性能优化（大文件流式处理）
- OPFS 的 `walkDir` 错误处理

### 2. 高级功能
- 文件元数据：size / mtime / permissions（可选）
- 符号链接支持（如果 backend 支持）
- 批量操作：`batchGet/batchSet`

### 3. 错误处理
- 统一错误格式：`{ path, error: string }`
- 区分错误类型：NotFound / PermissionDenied / IOError
- readOnly 模式下的写操作拦截

### 4. 测试覆盖
- 每个 backend 的完整测试套件
- 跨 backend 一致性测试
- 边界 case（空路径、特殊字符、并发写）

### 5. 文档
- README 加使用示例
- 每个 backend 的配置说明
- 性能对比表（IndexedDB vs OPFS vs Node fs）

## 验收标准
- 三个 backend 通过相同的测试套件
- 所有公开 API 有 JSDoc
- README 有完整示例
