# M22 Technical Design: Runtime层修复 (llm/stt/tts/sense/memory)

## T1: src/runtime/llm.js
Adapter pattern. Try Ollama first (HTTP stream), fallback to OpenAI/Anthropic on timeout/error.
Exports: `chat(messages, options) → AsyncIterable<string>`

## T2: src/runtime/stt.js
Adapter pattern. Providers: SenseVoice (local), Whisper (local), OpenAI Whisper (cloud).
Exports: `transcribe(audioBuffer: Buffer) → Promise<string>`

## T3: src/runtime/tts.js
Adapter pattern. Providers: Kokoro (local), Piper (local), OpenAI TTS (cloud).
Exports: `synthesize(text: string) → Promise<Buffer>`

## T4: src/runtime/sense.js
Wraps agentic-sense MediaPipe. Manages lifecycle.
Exports: `start(options) → void`, `stop() → void`, `isRunning() → boolean`

## T5: src/runtime/memory.js
Wraps agentic-store + agentic-embed for vector memory.
Exports: `store(key: string, value: string, embedding?: number[]) → Promise<void>`
         `retrieve(query: string, topK: number) → Promise<Array<{key, value, score}>>`

## Dependencies
- T1 depends on: profiles/default.json (provider config), agentic-core
- T2/T3 depend on: agentic-voice
- T4 depends on: agentic-sense
- T5 depends on: agentic-store, agentic-embed
- All blocked by task-1775510912106 (m21 detector/profiles fix)
