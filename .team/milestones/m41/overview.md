# M41: Runtime层完整实现 + Server层核心

## 目标
补全架构缺口：Runtime层全部实现，Server层核心服务，默认Profile。

## 任务

| Task | 内容 | Status | Priority |
|------|------|--------|----------|
| task-1775519613741 | src/runtime/llm.js — chat stream实现 | testing | P0 |
| task-1775519617446 | src/runtime/stt.js — transcribe实现 | review | P0 |
| task-1775519617481 | src/runtime/tts.js — synthesize实现 | review | P0 |
| task-1775520048129 | src/detector/profiles.js — getProfile(hardware) | todo | P0 |
| task-1775520092708 | profiles/default.json — 内置默认硬件Profile | todo | P0 |
| task-1775520086865 | src/runtime/sense.js — MediaPipe headless | todo | P0 |
| task-1775520086899 | src/runtime/memory.js — memory runtime | todo | P0 |
| task-1775520092615 | src/server/hub.js — device management | todo | P0 |
| task-1775520092648 | src/server/brain.js — LLM inference + tool calling | todo | P0 |
| task-1775520092677 | src/server/api.js — REST API endpoints | todo | P0 |

## 剩余架构缺口 (下一里程碑)
- src/ui/admin/ — admin panel (P1)
- src/detector/optimizer.js — partial coverage (P1)
- src/ui/client/ — admin route missing (P1)

## 验收标准
- 所有 src/runtime/*.js 实现架构规定接口
- src/server/hub.js、brain.js、api.js 实现完成
- profiles/default.json 存在，无需CDN即可运行
- architecture match > 80%
