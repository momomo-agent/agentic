# optimizer → llm.js 硬件自适应接线

## Progress

Replaced hardcoded `gemma4:26b` in `loadConfig()` with hardware detection via `detectHardware()` + `getProfile()`. Added process-lifetime cache via `_config`.
