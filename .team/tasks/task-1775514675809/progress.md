# profiles/default.json内置硬件配置

## Progress

Verified profiles/default.json exists, is valid JSON, matches design structure:
- darwin/arm64/apple-silicon/16GB profile
- linux/nvidia/8GB profile
- catch-all fallback (empty match, last entry)

profiles.js loads it at line 109-110 as offline fallback. No changes needed.
