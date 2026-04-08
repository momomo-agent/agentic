# M12 DBB Check

**Match: 80%** | 2026-04-06T21:06:17Z

## Pass
- setup.js installOllama(): spawns sh -c <cmd> — executes, not just prints
- pullModel(): spawns ollama pull with ora spinner
- Install failure: rejects with non-zero exit code error
- stt.js transcribe(): returns string, empty buffer → EMPTY_AUDIO error
- stt.js fallback: ADAPTERS.default = openai-whisper
- tts.js synthesize(): returns Buffer, empty text → EMPTY_TEXT error
- tts.js fallback: ADAPTERS.default = openai-tts

## Partial/Missing
- README.md: not found at project root
