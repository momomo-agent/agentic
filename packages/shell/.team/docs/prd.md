# PRD — agentic-shell

## 目标
完善虚拟 shell 环境，让 AI 能像操作真实终端一样工作。

## 当前状态
- ✓ 基础命令：ls/cat/grep/find/pwd/cd/mkdir/rm/mv/cp/echo/touch/head/tail/wc
- ✓ 目录识别：ls 能区分文件和目录
- ✓ 参数解析：支持引号、flag

## 待完善

### 1. 命令增强
- `grep -r` 递归搜索
- `find -type f/d` 文件/目录过滤
- `ls -a` 显示隐藏文件
- `cat` 支持多文件
- pipe 支持：`cat file | grep pattern`

### 2. 错误处理
- 文件不存在时返回标准错误格式
- 目录操作失败时给出清晰提示
- 权限检查（如果 filesystem 支持 readOnly）

### 3. 性能优化
- `ls` 大目录时分页
- `grep` 大文件时流式处理

### 4. 测试覆盖
- 每个命令的单元测试
- 边界 case（空文件、特殊字符、路径解析）
- 跨 backend 一致性测试

## 验收标准
- 所有命令有测试覆盖
- 错误信息符合 UNIX 标准
- 跨 backend 行为一致
