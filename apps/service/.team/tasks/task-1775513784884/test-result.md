# Test Result: sense.js服务端无头模式

## Summary
- **Status**: PASSED
- **Tests**: 11 passed, 0 failed

## Results
- ✅ exports initHeadless
- ✅ initHeadless does not set _video (no DOM access)
- ✅ calls createPipeline(options)
- ✅ exports detectFrame
- ✅ returns empty result when pipeline is null
- ✅ returns empty result when buffer is null
- ✅ delegates to detect(buffer)
- ✅ exports init (existing API preserved)
- ✅ exports start (existing API preserved)
- ✅ exports stop (existing API preserved)
- ✅ exports detect (existing API preserved)

## DBB Verification
- [x] initHeadless() creates pipeline without videoElement
- [x] detectFrame(buffer) returns SenseResult shape
- [x] detectFrame before init returns empty result
- [x] detectFrame(null) returns empty result, no throw
- [x] Existing browser API unchanged
