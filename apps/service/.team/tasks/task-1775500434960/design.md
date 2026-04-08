# Task Design — STT/TTS 完整性修复

## 文件
- `src/runtime/stt.js` — 验证并修复云端回退路径
- `src/runtime/tts.js` — 验证并修复云端回退路径

## 当前状态
两个文件已有基本结构：`init()` 加载 adapter，`transcribe()`/`synthesize()` 委托给 adapter。
问题：`agentic-voice/openai-whisper` 和 `agentic-voice/openai-tts` 适配器是否实现了正确接口未验证；本地 adapter 加载失败时无自动回退。

## 修改方案

### stt.js — 添加回退逻辑
```js
export async function init() {
  const profile = await getProfile().catch(() => ({}));
  const provider = profile?.stt?.provider ?? 'default';
  const load = ADAPTERS[provider] ?? ADAPTERS.default;
  try {
    adapter = await load();
  } catch {
    adapter = await ADAPTERS.default();  // 回退到云端
  }
}
```

### tts.js — 添加回退逻辑（同上模式）
```js
export async function init() {
  const profile = await getProfile().catch(() => ({}));
  const provider = profile?.tts?.provider ?? 'default';
  const load = ADAPTERS[provider] ?? ADAPTERS.default;
  try {
    adapter = await load();
  } catch {
    adapter = await ADAPTERS.default();
  }
}
```

### 验证 agentic-voice 适配器接口
- `agentic-voice/openai-whisper` 必须导出 `transcribe(buffer): Promise<string>`
- `agentic-voice/openai-tts` 必须导出 `synthesize(text): Promise<Buffer>`
- 若接口不符，在 stt.js/tts.js 中添加包装层对齐

## 边界情况
- 本地 adapter import 失败 → 静默回退到 default（云端）
- 云端 adapter 也失败 → reject Promise，调用方处理
- `OPENAI_API_KEY` 未设置 → 云端 adapter 抛出明确错误

## 测试用例
1. 本地 provider 可用 → 使用本地 adapter
2. 本地 provider import 失败 → 自动使用 default adapter
3. `transcribe(validBuffer)` → 返回非空字符串
4. `synthesize('hello')` → 返回 Buffer
5. `transcribe(emptyBuffer)` → reject with EMPTY_AUDIO
6. `synthesize('')` → reject with EMPTY_TEXT
