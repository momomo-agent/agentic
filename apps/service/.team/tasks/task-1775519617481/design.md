# Design: src/runtime/tts.js

## Interface
```js
export async function init(): Promise<void>
export async function synthesize(text: string): Promise<Buffer>
```

## Logic
1. `init()`: `getProfile()` → select provider key → dynamic import adapter → fallback to default on error
2. `synthesize(text)`: guard null/blank → `adapter.synthesize(text)`

## Adapter Map
```js
{ kokoro: 'agentic-voice/kokoro', piper: 'agentic-voice/piper', default: 'agentic-voice/openai-tts' }
```

## Error Handling
- Not initialized: throw `Error('not initialized')`
- Blank text: throw `Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' })`
- Adapter load failure: fall back to default

## Dependencies
- `../detector/profiles.js` → `getProfile()`

## Test Cases
- valid text → Buffer
- empty/whitespace text → EMPTY_TEXT error
- missing adapter → falls back to default
