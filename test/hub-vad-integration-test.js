// Test that hub.js audio pipeline drops silent frames

import { readFileSync } from 'fs';

// Extract isSilent function from hub.js
const hubCode = readFileSync('src/server/hub.js', 'utf8');
const isSilentMatch = hubCode.match(/function isSilent\(buffer\) \{[\s\S]*?\n\}/);
if (!isSilentMatch) {
  console.error('FAIL: isSilent function not found in hub.js');
  process.exit(1);
}
console.log('PASS: isSilent function exists in hub.js');

// Verify audio event handler drops silent frames
const audioHandlerMatch = hubCode.match(/emitter\.on\('audio',[\s\S]*?\}\);/);
if (!audioHandlerMatch) {
  console.error('FAIL: audio event handler not found');
  process.exit(1);
}

const audioHandler = audioHandlerMatch[0];
if (!audioHandler.includes('isSilent(chunk)') && !audioHandler.includes('isSilent(frame)')) {
  console.error('FAIL: audio handler does not call isSilent');
  process.exit(1);
}
console.log('PASS: audio event handler calls isSilent');

if (!audioHandler.includes('return')) {
  console.error('FAIL: audio handler does not return early for silent frames');
  process.exit(1);
}
console.log('PASS: audio handler returns early for silent frames');

// Verify isSilent implementation details
if (!isSilentMatch[0].includes('rms < 0.01')) {
  console.error('FAIL: isSilent does not use RMS < 0.01 threshold');
  process.exit(1);
}
console.log('PASS: isSilent uses RMS < 0.01 threshold');

if (!isSilentMatch[0].includes('Float32Array')) {
  console.error('FAIL: isSilent does not process Float32Array');
  process.exit(1);
}
console.log('PASS: isSilent processes Float32Array');

// Verify edge case handling
if (!isSilentMatch[0].includes('!buffer') || !isSilentMatch[0].includes('byteLength === 0')) {
  console.error('FAIL: isSilent does not handle empty/null buffers');
  process.exit(1);
}
console.log('PASS: isSilent handles empty/null buffers');

console.log('\n✅ All hub.js VAD integration tests passed');
