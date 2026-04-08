# M3 技术设计：语音能力 + 管理面板

## 架构概览

M3 在 M2 基础上补全两个 runtime 模块（stt/tts）并新增 admin UI。

```
agentic-voice
  ├── stt.js  ← src/runtime/stt.js 封装
  └── tts.js  ← src/runtime/tts.js 封装

server/api.js
  ├── POST /api/transcribe  → runtime/stt.js
  └── POST /api/synthesize  → runtime/tts.js

src/ui/admin/   ← Vue 3 SPA，调用 /api/status + /api/config
```

## 模块设计

### runtime/stt.js
- 懒加载 agentic-voice STT provider
- 导出单例 `transcribe(audioBuffer: Buffer) → Promise<string>`
- 错误统一包装为 `SttError`

### runtime/tts.js
- 懒加载 agentic-voice TTS provider
- 导出单例 `synthesize(text: string) → Promise<Buffer>`
- 错误统一包装为 `TtsError`

### server/api.js 新增端点
- `POST /api/transcribe`：multer 解析 audio 字段 → stt.transcribe → `{ text }`
- `POST /api/synthesize`：JSON body `{ text }` → tts.synthesize → 返回 wav buffer

### src/ui/admin/
- 单页 Vue 3 组件，挂载到 `/admin`
- 三个区块：HardwareInfo、ProfileConfig、LogViewer
- 数据通过 `fetch('/api/status')` 和 `fetch('/api/config')` 获取

## 依赖
- `agentic-voice`（已在 package.json）
- `multer`（文件上传，需确认是否已安装）
