import { AgenticClient } from 'agentic-client'

export const ai = new AgenticClient(location.origin)

export function base64ToBlob(b64, mime) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function float32ToWavBlob(float32, sampleRate) {
  const numSamples = float32.length
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, numSamples * 2, true)
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export function resizeImage(dataUrl, maxWidth = 1024) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      if (img.width <= maxWidth) return resolve(dataUrl)
      const canvas = document.createElement('canvas')
      const scale = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.src = dataUrl
  })
}

export async function loadVAD() {
  const VAD_VER = '0.0.29'
  const ORT_VER = '1.22.0'
  if (!window.vad) {
    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src; s.onload = resolve; s.onerror = reject
      document.head.appendChild(s)
    })
    await loadScript(`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/ort.wasm.min.js`)
    await loadScript(`https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VER}/dist/bundle.min.js`)
  }
  return { VAD_VER, ORT_VER }
}
