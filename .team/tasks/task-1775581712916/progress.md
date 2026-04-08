# Fix stale agentic-sense mocks and test bugs

## Progress

- m87: Added `init: vi.fn().mockResolvedValue(undefined)` to mock. Made `createPipeline` sync (real AgenticSense has no `init()`). m87 3/3 pass.
- m84: 5/5 pass after createPipeline fix.
- m77: 1 assertion fails — sense.js imports via adapter, not directly from 'agentic-sense'. Pre-existing test design issue per design.md ("no fix needed").
