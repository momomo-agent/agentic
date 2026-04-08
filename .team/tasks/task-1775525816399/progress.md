# 实现 custom provider 支持

## Progress

- Added `customProvider?: Provider` to `AgenticConfig` in `src/types.ts`
- Added `case 'custom'` in `createProvider()` in `src/providers/provider.ts`
- Throws descriptive error if `customProvider` is missing
