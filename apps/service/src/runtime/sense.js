import { createPipeline } from './adapters/sense.js';
import { EventEmitter } from 'node:events';
import { detectVoiceActivity } from './vad.js';

let pipeline = null;
let intervalId = null;
const handlers = {};

export async function init(videoElement) {
  pipeline = await createPipeline({ face: true, gesture: true, object: true });
  pipeline._video = videoElement;
}

export function on(type, handler) {
  if (!handlers[type]) handlers[type] = [];
  handlers[type].push(handler);
}

function emit(type, data) {
  const event = { type, data, ts: Date.now() };
  (handlers[type] || []).forEach(h => h(event));
}

export function start() {
  if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
  function loop() {
    if (intervalId == null) return;
    const video = pipeline?._video;
    if (video && video.readyState >= 2) {
      const result = pipeline.detect(video);
      if (result.faces?.length) {
        result.faces.forEach(f => emit('face_detected', { boundingBox: f.boundingBox }));
      }
      if (result.gestures?.length) {
        result.gestures.forEach(g => emit('gesture_detected', { gesture: g.gesture }));
      }
      if (result.objects?.length) {
        result.objects
          .filter(o => o.confidence > 0.5)
          .forEach(o => emit('object_detected', { label: o.label, confidence: o.confidence }));
      }
    }
  }
  intervalId = setInterval(loop, 16);
}

export function detect(frame) {
  if (!pipeline) return { faces: [], gestures: [], objects: [] }
  const result = pipeline.detect(frame)
  return {
    faces: (result.faces || []).map(f => ({ boundingBox: f.boundingBox })),
    gestures: (result.gestures || []).map(g => ({ gesture: g.gesture })),
    objects: (result.objects || []).filter(o => o.confidence > 0.5)
                                   .map(o => ({ label: o.label, confidence: o.confidence }))
  }
}

export function stop() {
  if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
  pipeline = null;
}

let _recorder = null;

export async function startWakeWordPipeline(onWakeWord) {
  if (_recorder) stopWakeWordPipeline();

  // Check if sox is available before attempting to use node-record-lpcm16
  const { execSync } = await import('node:child_process');
  try {
    execSync('which sox', { stdio: 'ignore' });
  } catch {
    console.warn('[sense] sox not found — wake word pipeline disabled (install sox to enable)');
    return;
  }

  let record;
  try {
    record = (await import('node-record-lpcm16')).default;
  } catch {
    console.warn('[sense] node-record-lpcm16 unavailable — wake word pipeline disabled');
    return;
  }

  try {
    _recorder = record.record({ sampleRate: 16000, channels: 1 });
    // Handle spawn errors (e.g. sox not installed) on the child process
    _recorder.process?.on('error', (err) => {
      console.warn('[sense] mic spawn error:', err.message);
      _recorder = null;
    });
    _recorder.stream()
      .on('error', (err) => { console.warn('[sense] mic error:', err.message); _recorder = null; })
      .on('data', (buf) => { if (detectVoiceActivity(buf)) { onWakeWord(); emit('wake_word', {}); } });
    console.log('[sense] Wake word pipeline started');
  } catch (err) {
    console.warn('[sense] mic start failed:', err.message);
    _recorder = null;
  }
}

export function stopWakeWordPipeline() {
  try { _recorder?.stop(); } catch { /* ignore */ }
  _recorder = null;
}

export async function initHeadless(options = { face: true, gesture: true, object: true }) {
  pipeline = await createPipeline(options);
}

export async function startHeadless() {
  const emitter = new EventEmitter();
  await startWakeWordPipeline(() => emitter.emit('wakeword'));
  return emitter;
}

export function detectFrame(buffer) {
  if (!pipeline || buffer == null) return { faces: [], gestures: [], objects: [] };
  return detect(buffer);
}
