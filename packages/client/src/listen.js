/**
 * listen() — Speech-to-text
 *
 * Usage:
 *   const text = await ai.listen(audioBlob)
 *   const text = await ai.listen(audioBlob, { language: 'zh' })
 */
export async function listen(transport, audio, options = {}) {
  const fd = new FormData()

  if (audio instanceof Blob) {
    fd.append('audio', audio, 'audio.webm')
  } else if (typeof File !== 'undefined' && audio instanceof File) {
    fd.append('audio', audio)
  } else {
    // Node.js Buffer or ArrayBuffer
    const blob = new Blob([audio], { type: 'audio/webm' })
    fd.append('audio', blob, 'audio.webm')
  }

  if (options.language) fd.append('language', options.language)

  const result = await transport.postFormData('/api/transcribe', fd)
  return typeof result === 'string' ? result : result.text || result.transcript || ''
}
