# Task Design: sense.js Node.js兼容 - 移除requestAnimationFrame

## Files to Modify
- `src/runtime/sense.js`

## Problem
`start()` uses `requestAnimationFrame` which doesn't exist in Node.js, causing `ReferenceError`.

## Change
Replace `requestAnimationFrame`/`cancelAnimationFrame` with `setInterval`/`clearInterval`.

## Function Signatures (unchanged)
```js
export function start(): void
export function stop(): void
```

## Logic
```js
// Replace rafId with intervalId
let intervalId = null;

export function start() {
  intervalId = setInterval(() => {
    // same loop body, without recursive rAF call
  }, 100); // ~10fps, sufficient for server-side sense
}

export function stop() {
  if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
  pipeline = null;
}
```

## Edge Cases
- `start()` called multiple times: clear existing interval before setting new one
- `stop()` called before `start()`: no-op (intervalId is null)

## Test Cases
- `node -e "require('./src/runtime/sense.js')"` exits 0 with no error
- `start()` then `stop()` does not throw
