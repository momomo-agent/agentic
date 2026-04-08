# 升级 code_exec 沙箱

## Progress

- Replaced `new Function()` with `quickjs-emscripten` sandbox in `src/tools/code.ts`
- Added `quickjs-emscripten@^0.29.0` to `package.json`
- Installed via `pnpm install --no-frozen-lockfile`
- Build passes ✓

## Notes

- `val === null` also omits `→` line (null is equally meaningless as undefined)
