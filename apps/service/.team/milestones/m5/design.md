# M5 Technical Design: 感知运行时 + 记忆模块 + Docker 打包

## sense.js
- 封装 `agentic-sense` MediaPipe API
- `detect(frame)` → `{ faces, gestures, objects }`
- 空帧/null 返回 `{ faces: [], gestures: [], objects: [] }`

## memory.js
- 依赖 `agentic-embed` + `agentic-store`
- `add(text)` → 向量化后写入 store
- `search(query, topK=5)` → 向量化 query，余弦相似度排序返回 topK
- 空 query 返回 `[]`

## Docker
- `install/Dockerfile`: Node 20 Alpine, `npm ci --omit=dev`, EXPOSE 3000
- `install/docker-compose.yml`: port 3000:3000, config volume

## 测试覆盖
- 补全工具调用空参数、并发写、SIGINT、npx e2e、store DB 失败场景
- 目标覆盖率 ≥ 98%
