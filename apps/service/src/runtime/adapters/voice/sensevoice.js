const BASE = process.env.SENSEVOICE_URL || 'http://127.0.0.1:18906';
const TRANSCRIBE_URL = BASE.replace(/\/+$/, '') + '/transcribe';
const HEALTH_URL = BASE.replace(/\/+$/, '').replace(/\/transcribe$/, '') + '/health';

export async function check() {
  const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`SenseVoice health ${res.status}`);
}

export async function transcribe(buffer) {
  const res = await fetch(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/webm' },
    body: buffer,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`SenseVoice ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || '';
}
