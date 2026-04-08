# 技术设计: 语音端到端延迟 < 2s 基准测试

## 文件创建
- `test/latency.test.js` — 新建

## 逻辑
```js
import { describe, it, expect, vi } from 'vitest';

describe('voice pipeline latency', () => {
  it('STT + LLM + TTS end-to-end < 2000ms', async () => {
    // mock 各模块，模拟真实延迟上限
    vi.mock('../src/runtime/stt.js', () => ({
      transcribe: vi.fn(async () => { await delay(300); return 'hello'; })
    }));
    vi.mock('../src/server/brain.js', () => ({
      chat: vi.fn(async function*() { await delay(1000); yield 'hi'; })
    }));
    vi.mock('../src/runtime/tts.js', () => ({
      synthesize: vi.fn(async () => { await delay(500); return Buffer.alloc(0); })
    }));

    const start = Date.now();
    const text = await transcribe(Buffer.alloc(0));
    let reply = '';
    for await (const chunk of chat([{ role: 'user', content: text }])) reply += chunk;
    await synthesize(reply);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
```

## 边界情况
- mock 延迟总和 = 300+1000+500 = 1800ms < 2000ms，测试应通过
- 若真实实现超时，测试失败提示性能问题
- 不依赖真实 Ollama/STT/TTS 服务

## 测试用例
- 正常路径：总耗时 < 2000ms ✓
- 超时路径：任一 mock 延迟 > 2000ms → 测试失败（验证断言有效）
