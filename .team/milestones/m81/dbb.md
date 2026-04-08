# M81: Voice Latency Benchmark + npx Entrypoint Verification — DBB

## Definition of Done

### Voice Latency Benchmark
- [ ] Benchmark test measures STT+LLM+TTS end-to-end latency
- [ ] Latency logged per voice request in production
- [ ] Test fails if latency exceeds 2 seconds
- [ ] Benchmark runs in CI pipeline

### npx Entrypoint Verification
- [ ] `package.json` `bin` field correctly points to `bin/agentic-service.js`
- [ ] `npx agentic-service` starts service without errors
- [ ] CLI shows startup progress and opens browser
- [ ] Works on fresh install (no global dependencies)

### External Package Wiring
- [ ] `agentic-embed` properly wrapped in `src/runtime/embed.js`
- [ ] `agentic-sense` properly wrapped in `src/runtime/sense.js`
- [ ] Both packages in `package.json` dependencies
- [ ] Import maps configured correctly

### Documentation
- [ ] README.md covers npx installation
- [ ] README.md documents Docker usage
- [ ] README.md lists API endpoints
- [ ] README.md specifies hardware requirements

## Verification Commands

```bash
# Test voice latency
npm test -- test/benchmark/voice-latency.test.js

# Test npx entrypoint
npx agentic-service

# Verify external packages
npm test -- test/runtime/embed.test.js
npm test -- test/runtime/sense.test.js

# Check documentation
grep -q "npx agentic-service" README.md
grep -q "docker run" README.md
```

## Success Criteria
- Voice latency benchmark passes (<2s)
- npx command works on clean install
- External packages properly integrated
- Documentation complete
