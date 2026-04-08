# M10 DBB Check

**Match: 82%** | 2026-04-06T21:06:17Z

## Pass
- sense.detect(frame): returns {faces,gestures,objects}, null pipeline returns empty
- sense.on() event interface still works alongside detect()
- memory.add(): _lock mutex chain prevents concurrent write data loss
- llm.js: calls getProfile(hardware) via detector/profiles.js — hardware-adaptive
- Different hardware profiles → different model names (profiles/default.json)
- Config hot-reload: llm.js calls watchProfiles() on startup

## Partial
- install/setup.sh: file exists but Node.js detection logic not fully verified
- Hot-reload during in-flight requests: no explicit drain mechanism confirmed
