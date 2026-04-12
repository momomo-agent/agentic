/**
 * converse() — Voice-in, text+audio-out (combined listen+think+speak)
 *
 * Usage:
 *   const { text, audio } = await ai.converse(audioBlob)
 *   const { text, audio } = await ai.converse(audioBlob, { voice: 'nova' })
 */
export async function converse(transport, audio, options = {}) {
  const fd = new FormData()

  if (audio instanceof Blob) {
    fd.append('audio', audio, 'audio.webm')
  } else if (typeof File !== 'undefined' && audio instanceof File) {
    fd.append('audio', audio)
  } else {
    const blob = new Blob([audio], { type: 'audio/webm' })
    fd.append('audio', blob, 'audio.webm')
  }

  if (options.voice) fd.append('voice', options.voice)
  if (options.model) fd.append('model', options.model)
  if (options.sessionId) fd.append('sessionId', options.sessionId)

  const result = await transport.postFormData('/api/voice', fd)

  // Server returns { text, audio } where audio is base64 or binary
  if (result instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer(result))) {
    return { text: '', audio: result }
  }
  return {
    text: result.text || result.transcript || '',
    audio: result.audio || null
  }
}
