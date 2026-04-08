# 修复 provider apiKey 校验

## Progress

- Added `if (!config.apiKey) throw new Error('apiKey is required')` at top of `detectProvider()`
- Added `if (provider !== 'custom' && !config.apiKey) throw new Error(...)` in `createProvider()` before switch
