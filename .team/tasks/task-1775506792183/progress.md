# llm.js硬件自适应: 接入optimizer输出

## Progress

- Verified: no hardcoded model strings in llm.js
- `loadConfig()` already calls `getProfile(hardware)` → `matchProfile` → hardware-based model
- `chatWithOllama` uses `config.llm.model` — fully adaptive
- No code change needed; task confirmed complete as-is
