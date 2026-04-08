# Test Result: agentic-sense 视觉感知

## Status: PASSED

## Tests: 6/6 passed

- DBB-003: face_detected event emitted with boundingBox ✓
- DBB-004: gesture_detected event emitted ✓
- object confidence > 0.5 → object_detected emitted ✓
- object confidence <= 0.5 → no event ✓
- video not ready (readyState < 2) → skips frame ✓
- stop() → no more events ✓

## File: test/runtime/sense-pipeline.test.js
