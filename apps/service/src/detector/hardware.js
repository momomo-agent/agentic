import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';

const execAsync = promisify(exec);

async function detectGPU(platform) {
  switch (platform) {
    case 'darwin': return detectMacGPU();
    case 'linux': return detectLinuxGPU();
    case 'win32': return detectWindowsGPU();
    default: return { type: 'none', vram: 0 };
  }
}

async function detectMacGPU() {
  try {
    const { stdout } = await execAsync('system_profiler SPDisplaysDataType');
    if (stdout.includes('Apple M') || stdout.includes('Apple Silicon')) {
      const vramMatch = stdout.match(/VRAM.*?(\d+)\s*GB/i);
      return { type: 'apple-silicon', vram: vramMatch ? parseInt(vramMatch[1]) : 0 };
    }
    if (stdout.includes('NVIDIA')) return { type: 'nvidia', vram: parseVRAM(stdout) };
    if (stdout.includes('AMD')) return { type: 'amd', vram: parseVRAM(stdout) };
    return { type: 'none', vram: 0 };
  } catch { return { type: 'none', vram: 0 }; }
}

async function detectLinuxGPU() {
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits');
    return { type: 'nvidia', vram: Math.round(parseInt(stdout.trim()) / 1024) };
  } catch {}
  try {
    const { stdout } = await execAsync('rocm-smi --showmeminfo vram');
    const m = stdout.match(/(\d+)\s*MB/);
    return { type: 'amd', vram: m ? Math.round(parseInt(m[1]) / 1024) : 0 };
  } catch {}
  try {
    await access('/proc/driver/nvidia/version');
    return { type: 'nvidia', vram: 0 };
  } catch {}
  return { type: 'none', vram: 0 };
}

async function detectWindowsGPU() {
  try {
    const { stdout } = await execAsync('wmic path win32_VideoController get Name,AdapterRAM');
    if (stdout.includes('NVIDIA')) return { type: 'nvidia', vram: parseWindowsVRAM(stdout) };
    if (stdout.includes('AMD') || stdout.includes('Radeon')) return { type: 'amd', vram: parseWindowsVRAM(stdout) };
    return { type: 'none', vram: 0 };
  } catch { return { type: 'none', vram: 0 }; }
}

function parseVRAM(output) {
  const match = output.match(/VRAM.*?(\d+)\s*(?:GB|MB)/i);
  if (match) {
    const value = parseInt(match[1]);
    return match[0].toUpperCase().includes('GB') ? value : Math.round(value / 1024);
  }
  return 0;
}

function parseWindowsVRAM(output) {
  const match = output.match(/(\d+)/);
  return match ? Math.round(parseInt(match[1]) / (1024 ** 3)) : 0;
}

/**
 * 检测硬件信息
 * @returns {Promise<{platform: string, arch: string, gpu: {type: string, vram: number}, memory: number, cpu: {cores: number, model: string}}>}
 */
export async function detect() {
  try {
    const platform = os.platform();
    const arch = os.arch();

    // 并行检测
    const [gpu, cpu, memory] = await Promise.all([
      detectGPU(platform),
      Promise.resolve(getCPUInfo()),
      Promise.resolve(getMemoryInfo())
    ]);

    return { platform, arch, gpu, memory, cpu };
  } catch (error) {
    console.error('Hardware detection failed:', error);
    // 返回最小可用信息
    return {
      platform: os.platform(),
      arch: os.arch(),
      gpu: { type: 'none', vram: 0 },
      memory: Math.round(os.totalmem() / (1024 ** 3)),
      cpu: { cores: os.cpus().length, model: 'unknown' }
    };
  }
}

/**
 * 获取 CPU 信息
 * @returns {{cores: number, model: string}}
 */
function getCPUInfo() {
  const cpus = os.cpus();
  return {
    cores: cpus.length,
    model: cpus[0].model
  };
}

/**
 * 获取内存信息（GB）
 * @returns {number}
 */
function getMemoryInfo() {
  const totalMem = os.totalmem();
  return Math.round(totalMem / (1024 ** 3));
}
