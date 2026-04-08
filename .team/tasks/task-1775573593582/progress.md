# Verify and fix cloud fallback (OpenAI/Anthropic) in llm.js

## Progress

Verified llm.js fallback logic — no fixes needed.
- All profiles in default.json have `fallback: { provider, model }`
- llm.js catches Ollama errors, checks API keys, yields `{type:'meta',provider:'cloud'}`, delegates to cloud
- double-record of llm_total on success path is acceptable per design
