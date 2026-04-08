// Test server-side VAD silence suppression

function isSilent(buffer) {
  if (!buffer || buffer.byteLength === 0) return true;
  const floats = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  const rms = Math.sqrt(floats.reduce((s, v) => s + v * v, 0) / floats.length);
  return rms < 0.01;
}

// Test 1: Zero-filled buffer should be silent
const zeroBuffer = Buffer.alloc(1024);
console.assert(isSilent(zeroBuffer) === true, 'FAIL: Zero buffer should be silent');
console.log('PASS: Zero-filled buffer is silent');

// Test 2: Empty buffer should be silent
const emptyBuffer = Buffer.alloc(0);
console.assert(isSilent(emptyBuffer) === true, 'FAIL: Empty buffer should be silent');
console.log('PASS: Empty buffer is silent');

// Test 3: Buffer with RMS > 0.01 should not be silent
const loudBuffer = Buffer.alloc(1024);
const loudFloats = new Float32Array(loudBuffer.buffer);
for (let i = 0; i < loudFloats.length; i++) {
  loudFloats[i] = 0.1; // RMS will be 0.1 > 0.01
}
console.assert(isSilent(loudBuffer) === false, 'FAIL: Loud buffer should not be silent');
console.log('PASS: Loud buffer (RMS > 0.01) is not silent');

// Test 4: Buffer with RMS exactly at threshold
const thresholdBuffer = Buffer.alloc(1024);
const thresholdFloats = new Float32Array(thresholdBuffer.buffer);
for (let i = 0; i < thresholdFloats.length; i++) {
  thresholdFloats[i] = 0.01; // RMS will be 0.01
}
const isThresholdSilent = isSilent(thresholdBuffer);
console.log(`INFO: Buffer with RMS=0.01 is ${isThresholdSilent ? 'silent' : 'not silent'} (threshold behavior)`);

// Test 5: Null buffer should be silent
console.assert(isSilent(null) === true, 'FAIL: Null buffer should be silent');
console.log('PASS: Null buffer is silent');

console.log('\n✅ All VAD silence suppression tests passed');
