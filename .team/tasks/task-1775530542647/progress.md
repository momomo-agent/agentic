# Progress

## Status: Complete

cpu-only profile already exists in profiles/default.json (lines 57-65) with correct config:
- match: { "gpu": "cpu-only" }
- llm: gemma2:2b q4
- stt: sensevoice small
- tts: kokoro default
- fallback: openai gpt-4o-mini

No changes needed.
