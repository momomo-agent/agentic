const SILENCE_THRESHOLD = 0.01;

export function detectVoiceActivity(buffer) {
  if (!buffer || buffer.byteLength < 2) return false;
  const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += (samples[i] / 32768) ** 2;
  return Math.sqrt(sum / samples.length) > SILENCE_THRESHOLD;
}
