# M16: 测试覆盖率 + SIGINT + CDN + 多设备会话

## 目标
关闭剩余 DBB/Vision 差距，达到发布质量。

## 范围
1. 测试覆盖率验证 ≥98%（补充缺失测试）
2. SIGINT 优雅关闭处理（server/CLI 入口）
3. CDN URL 修正为 cdn.example.com（替换 jsdelivr.net）
4. 多设备跨会话共享验证/实现

## 验收标准
- `npm test -- --coverage` 报告覆盖率 ≥98%
- `process.on('SIGINT')` 在 server 入口存在并正确关闭服务
- profiles.js 中 CDN URL 为 cdn.example.com
- hub.js 支持跨设备 session 共享（sessionId 广播）
