export function optimize(hardware) {
  const { gpu, memory, cpu } = hardware;
  if (gpu.type === 'apple-silicon') {
    return { threads: 8, memoryLimit: Math.floor(memory * 0.75), model: 'gemma4:26b', quantization: 'q8' };
  }
  if (gpu.type === 'nvidia') {
    const vram = gpu.vram ?? memory * 0.5;
    return { threads: 4, memoryLimit: Math.floor(vram * 0.8), model: 'gemma4:13b', quantization: 'q4' };
  }
  return { threads: cpu.cores ?? 2, memoryLimit: Math.floor(memory * 0.5), model: 'gemma2:2b', quantization: 'q4' };
}

export function setupOllama(profile) {
  return profile;
}
