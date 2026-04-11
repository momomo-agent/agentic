# 更新 GET /v1/models 列出 embedding 和 audio 模型

## Progress

- Updated GET /v1/models from sync to async
- Now queries registry.modelsForCapability('embed'/'stt'/'tts')
- Each discovered model added with `{ id, object: 'model', created, owned_by }`
- Gracefully falls back to base model if registry throws
- Test: test/v1-models.test.js — 3 tests passing
- Verified: full suite 187 files, 1117 tests, all passing
