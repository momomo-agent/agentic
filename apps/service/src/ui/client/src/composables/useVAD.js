export function useVAD({ onStart, onStop, threshold = 0.01, silenceMs = 1200 }) {
  let audioCtx, processor, stream, speaking = false, silenceTimer = null;

  async function start() {
    if (audioCtx) return;
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const source = audioCtx.createMediaStreamSource(stream);
    processor = audioCtx.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (e) => {
      const samples = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      if (rms > threshold) {
        clearTimeout(silenceTimer); silenceTimer = null;
        if (!speaking) { speaking = true; onStart(); }
      } else if (speaking && !silenceTimer) {
        silenceTimer = setTimeout(() => { speaking = false; silenceTimer = null; onStop(); }, silenceMs);
      }
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
    document.addEventListener('visibilitychange', onVisibility);
  }

  function onVisibility() {
    if (document.hidden && speaking) { speaking = false; onStop(); }
  }

  function stop() {
    clearTimeout(silenceTimer); silenceTimer = null;
    processor?.disconnect();
    stream?.getTracks().forEach(t => t.stop());
    audioCtx?.close(); audioCtx = null;
    speaking = false;
    document.removeEventListener('visibilitychange', onVisibility);
  }

  return { start, stop, get isActive() { return speaking; } };
}
