export async function transcribe(buffer) {
  if (!process.env.OPENAI_API_KEY)
    throw Object.assign(new Error('OPENAI_API_KEY not set'), { code: 'NO_API_KEY' });
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI();
  const file = new File([buffer], 'audio.wav', { type: 'audio/wav' });
  const res = await client.audio.transcriptions.create({ model: 'whisper-1', file });
  return res.text;
}
