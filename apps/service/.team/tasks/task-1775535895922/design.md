# Design: Fix VAD callback signature mismatch

## Files to check
- `test/ui/m28-vad.test.js`
- `test/m62-server-vad.test.js`

## Root cause
`useVAD.js:1` expects `{ onStart, onStop }`. Failing tests likely pass `{ onSpeechStart, onSpeechEnd }` or similar wrong key names.

## Fix
In each failing VAD test, rename callback params to match the signature:
```js
// Wrong:
useVAD({ onSpeechStart: () => {}, onSpeechEnd: () => {} })

// Correct:
useVAD({ onStart: () => {}, onStop: () => {} })
```

## No source change needed
`useVAD.js` signature is correct. Only test mocks need alignment.

## Test to verify
`test/m43-vad.test.js` — onStart fires on loud frame, onStop fires after silence timeout
