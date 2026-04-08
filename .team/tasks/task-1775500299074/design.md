{
  "apple-silicon": {
    "llm": { "provider": "ollama", "model": "gemma4:26b", "quantization": "q8" },
    "stt": { "provider": "sensevoice", "model": "small" },
    "tts": { "provider": "kokoro", "voice": "default" },
    "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
  },
  "nvidia-high": {
    "llm": { "provider": "ollama", "model": "gemma4:26b", "quantization": "q4" },
    "stt": { "provider": "sensevoice", "model": "small" },
    "tts": { "provider": "kokoro", "voice": "default" },
    "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
  },
  "cpu-only": {
    "llm": { "provider": "ollama", "model": "gemma4:2b", "quantization": "q4" },
    "stt": { "provider": "sensevoice", "model": "small" },
    "tts": { "provider": "kokoro", "voice": "default" },
    "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
  }
}
