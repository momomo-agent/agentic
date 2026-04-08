# Design: 添加 profiles/default.json

## 目标
创建内置默认硬件 profile 文件，作为 CDN 不可用时的离线 fallback。

## 文件
- `profiles/default.json` — 新建

## 结构

```json
{
  "version": "1.0.0",
  "profiles": [
    {
      "match": { "platform": "darwin", "arch": "arm64", "gpu": "apple-silicon", "minMemory": 16 },
      "config": {
        "llm": { "provider": "ollama", "model": "gemma3:12b", "quantization": "q8" },
        "stt": { "provider": "sensevoice", "model": "small" },
        "tts": { "provider": "kokoro", "voice": "default" },
        "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
      }
    },
    {
      "match": { "platform": "darwin", "arch": "arm64", "gpu": "apple-silicon", "minMemory": 8 },
      "config": {
        "llm": { "provider": "ollama", "model": "gemma3:4b", "quantization": "q4" },
        "stt": { "provider": "sensevoice", "model": "small" },
        "tts": { "provider": "kokoro", "voice": "default" },
        "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
      }
    },
    {
      "match": { "platform": "linux", "gpu": "nvidia", "minMemory": 16 },
      "config": {
        "llm": { "provider": "ollama", "model": "gemma3:12b", "quantization": "q8" },
        "stt": { "provider": "sensevoice", "model": "small" },
        "tts": { "provider": "kokoro", "voice": "default" },
        "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
      }
    },
    {
      "match": {},
      "config": {
        "llm": { "provider": "openai", "model": "gpt-4o-mini", "quantization": null },
        "stt": { "provider": "openai", "model": "whisper-1" },
        "tts": { "provider": "openai", "voice": "alloy" },
        "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
      }
    }
  ]
}
```

## 规则
- 最后一条 `match: {}` 为兜底，`matcher.js` 会给它 score=1
- profiles 按优先级从高到低排列（matcher 会自动排序，但顺序清晰更易维护）
- `version` 字段用于缓存失效判断

## 测试用例
- `loadBuiltinProfiles()` 能成功解析此文件
- `matchProfile(data, { platform:'darwin', arch:'arm64', gpu:{type:'apple-silicon'}, memory:16 })` → 返回第一条 config
- `matchProfile(data, { platform:'win32', arch:'x64', gpu:{type:'none'}, memory:4 })` → 返回兜底 config
