export async function converse(transport, audio) {
  const formData = new FormData()
  formData.append('audio', audio, 'audio.wav')
  return transport.postBinaryFormData('/api/voice', formData)
}
