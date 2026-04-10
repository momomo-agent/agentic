export async function listen(transport, audio) {
  const formData = new FormData()
  formData.append('audio', audio, 'audio.wav')

  const result = await transport.postFormData('/api/transcribe', formData)
  if (result.skipped) return ''
  return result.text
}
