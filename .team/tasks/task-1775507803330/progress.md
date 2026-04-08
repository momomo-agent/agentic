# sense.js Node.js兼容: 移除requestAnimationFrame

## Progress

Replaced `requestAnimationFrame`/`cancelAnimationFrame` with `setInterval`/`clearInterval` in `src/runtime/sense.js`. `start()` uses `setInterval(..., 100)` with double-start guard. Done.
