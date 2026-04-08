# M5: 感知运行时 + 记忆模块 + Docker 打包

## 目标
完成架构中剩余的 runtime 模块（sense.js、memory.js），补全 install/ 打包方案，并覆盖关键边缘用例测试。

## 范围
- `src/runtime/sense.js` — 封装 agentic-sense（MediaPipe 人脸/手势/物体检测）
- `src/runtime/memory.js` — 基于 agentic-store + agentic-embed 的向量记忆检索
- `install/Dockerfile` + `install/docker-compose.yml` — Docker 打包与发布
- 边缘用例测试覆盖（工具调用、并发写、SIGINT、npx e2e）

## 验收标准
- sense.detect(frame) 返回检测结果（人脸/手势/物体）
- memory.search(query) 返回相关记忆片段
- docker build 成功，docker run -p 3000:3000 可访问服务
- 测试覆盖率 ≥ 98%，边缘用例清单清零
