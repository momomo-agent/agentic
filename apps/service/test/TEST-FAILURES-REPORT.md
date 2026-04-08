# Test Failures Report

**Generated**: 2026-04-07T04:10:00Z
**Test Run Summary**: 139 failed | 499 passed | 7 skipped (645 total)
**Coverage**: 77.4% (499/645 tests passing)

## Critical Issues

### 1. TTS Runtime Tests (6 failures)
**File**: `test/server/tts.test.js`
**Root Cause**: Test setup does not call `init()` before testing `synthesize()`
**Impact**: All TTS tests fail with "not initialized" error

**Fix Required**:
```javascript
beforeEach(async () => {
  vi.resetModules();
  mockProvider = { synthesize: vi.fn() };
  createTTS.mockResolvedValue(mockProvider);
  const mod = await import('../../src/runtime/tts.js');
  await mod.init(); // ADD THIS LINE
  synthesize = mod.synthesize;
});
```

### 2. WebSocket Hub Tests (1 failure)
**File**: `test/server/ws-hub.test.js`
**Test**: "disconnect removes device from registry"
**Root Cause**: Device not being removed from registry on WebSocket close
**Location**: `src/server/hub.js` WebSocket close handler

**Expected**: Device with id 'ws-4' should be removed from registry after `ws.close()`
**Actual**: Device remains in registry with status "online"

### 3. M9 DBB Tests (4 failures)
**File**: `test/server/m9-dbb.test.js`
**Root Cause**: Tests expect 'momo-ai' GitHub org but code uses 'momomo'
**Location**: `src/detector/profiles.js` CDN URL

**Fix Required**: Update CDN URL to use correct GitHub organization

### 4. M30 VAD Tests (4 failures)
**File**: `test/m30-vad.test.js`
**Root Cause**: Callback signature mismatch - "onStart is not a function"
**Impact**: VAD composable tests fail due to incorrect callback handling

### 5. Widespread Initialization Issues (100+ failures)
**Pattern**: Many test files fail due to missing module initialization or improper mocking

**Affected Areas**:
- Admin panel tests
- CLI server audit tests
- Brain tool use tests
- Hub heartbeat/wakeword tests
- Store delete tests
- Sense detection tests
- Profile tests
- HTTPS/LAN tests

## Test Infrastructure Problems

### Missing Test Setup Patterns
1. **Runtime modules** (TTS, STT, LLM) require `init()` before use
2. **Mocked modules** need proper initialization sequence
3. **WebSocket tests** need proper cleanup handlers
4. **Profile tests** have hardcoded org name expectations

### Recommended Actions

1. **Create test helpers** for common initialization patterns
2. **Standardize mock setup** across all runtime module tests
3. **Fix WebSocket cleanup** in hub.js
4. **Update GitHub org references** to match actual repository
5. **Review VAD callback signatures** for consistency

## Test Files Requiring Immediate Attention

Priority 1 (Blocking):
- `test/server/tts.test.js` - 6 failures
- `test/server/ws-hub.test.js` - 1 failure
- `test/server/m9-dbb.test.js` - 4 failures

Priority 2 (High Impact):
- `test/m30-vad.test.js` - 4 failures
- All admin panel tests
- All hub/brain integration tests

Priority 3 (Systematic Review):
- All profile tests
- All CLI tests
- All HTTPS/LAN tests

## Notes

The test suite has significant infrastructure issues that suggest tests were written before implementation was complete, or implementation changed without updating tests. A systematic review of test setup patterns is needed.

Many failures are not bugs in the implementation but rather issues with test mocking and initialization. However, the WebSocket cleanup issue appears to be a real implementation bug.
