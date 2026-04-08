# Design: 实现 VAD 自动语音检测

## Files
- `src/ui/client/composables/useVAD.js` (new)
- `src/ui/client/App.vue` (modify)

## useVAD.js

```javascript
// useVAD({ onStart, onStop, threshold=0.01, silenceMs=1500 }) → { start, stop }
export function useVAD({ onStart, onStop, threshold = 0.01, silenceMs = 1500 }) {
  let ctx, analyser, source, stream, rafId, silenceTimer

  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    ctx = new AudioContext()
    analyser = ctx.createAnalyser()
    source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
    let speaking = false
    const buf = new Float32Array(analyser.fftSize)

    function tick() {
      analyser.getFloatTimeDomainData(buf)
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length)
      if (rms > threshold) {
        clearTimeout(silenceTimer)
        if (!speaking) { speaking = true; onStart?.() }
      } else if (speaking) {
        silenceTimer = setTimeout(() => { speaking = false; onStop?.() }, silenceMs)
      }
      rafId = requestAnimationFrame(tick)
    }
    tick()
  }

  function stop() {
    cancelAnimationFrame(rafId)
    clearTimeout(silenceTimer)
    stream?.getTracks().forEach(t => t.stop())
    ctx?.close()
  }

  return { start, stop }
}
```

## App.vue integration
- 添加 `vadMode` ref (boolean)
- VAD mode: `useVAD({ onStart: startRecording, onStop: stopAndSend })`
- PTT mode: 保留现有 mousedown/mouseup 逻辑
- UI: toggle button 切换模式
- 权限拒绝: catch `NotAllowedError` → 显示错误提示

## Edge cases
- getUserMedia 失败 → 回退到 PTT，显示提示
- 页面卸载时调用 stop()
