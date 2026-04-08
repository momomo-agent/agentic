# Task: 硬件检测器 - Technical Design

## 目标
检测 GPU 类型、显存/内存、CPU 架构、OS，输出标准 JSON 格式。

## 文件清单

### 新建文件
- `src/detector/hardware.js` - 主检测模块
- `src/detector/gpu-detector.js` - GPU 专用检测
- `test/detector/hardware.test.js` - 单元测试

## 函数签名

### src/detector/hardware.js

```javascript
/**
 * 检测硬件信息
 * @returns {Promise<HardwareInfo>}
 */
export async function detect() {
  // 返回格式：
  // {
  //   platform: 'darwin' | 'linux' | 'win32',
  //   arch: 'arm64' | 'x64',
  //   gpu: { type: 'apple-silicon' | 'nvidia' | 'amd' | 'none', vram: number },
  //   memory: number,  // GB
  //   cpu: { cores: number, model: string }
  // }
}

/**
 * 获取 CPU 信息
 * @returns {Object} { cores: number, model: string }
 */
function getCPUInfo() {}

/**
 * 获取内存信息（GB）
 * @returns {number}
 */
function getMemoryInfo() {}
```

### src/detector/gpu-detector.js

```javascript
/**
 * 检测 GPU 信息
 * @param {string} platform - 操作系统平台
 * @returns {Promise<GPUInfo>} { type: string, vram: number }
 */
export async function detectGPU(platform) {}

/**
 * macOS GPU 检测
 * @returns {Promise<GPUInfo>}
 */
async function detectMacGPU() {}

/**
 * Linux GPU 检测
 * @returns {Promise<GPUInfo>}
 */
async function detectLinuxGPU() {}

/**
 * Windows GPU 检测
 * @returns {Promise<GPUInfo>}
 */
async function detectWindowsGPU() {}

/**
 * 解析 nvidia-smi 输出
 * @param {string} output - 命令输出
 * @returns {GPUInfo}
 */
function parseNvidiaSmi(output) {}
```

## 实现逻辑

### 1. 主检测流程 (hardware.js)

```javascript
export async function detect() {
  const platform = os.platform(); // darwin, linux, win32
  const arch = os.arch(); // arm64, x64

  // 并行检测
  const [gpu, cpu, memory] = await Promise.all([
    detectGPU(platform),
    Promise.resolve(getCPUInfo()),
    Promise.resolve(getMemoryInfo())
  ]);

  return { platform, arch, gpu, memory, cpu };
}
```

### 2. CPU 检测

```javascript
function getCPUInfo() {
  const cpus = os.cpus();
  return {
    cores: cpus.length,
    model: cpus[0].model
  };
}
```

### 3. 内存检测

```javascript
function getMemoryInfo() {
  const totalMem = os.totalmem();
  return Math.round(totalMem / (1024 ** 3)); // 转换为 GB
}
```

### 4. GPU 检测策略

#### macOS
```javascript
async function detectMacGPU() {
  try {
    // 执行 system_profiler SPDisplaysDataType
    const { stdout } = await execAsync('system_profiler SPDisplaysDataType');

    // 检查是否包含 "Apple" 关键字
    if (stdout.includes('Apple M') || stdout.includes('Apple Silicon')) {
      // 解析显存（通常是共享内存）
      const vramMatch = stdout.match(/VRAM.*?(\d+)\s*GB/i);
      const vram = vramMatch ? parseInt(vramMatch[1]) : 0;

      return { type: 'apple-silicon', vram };
    }

    // Intel Mac 可能有独立显卡
    if (stdout.includes('NVIDIA')) {
      return { type: 'nvidia', vram: parseVRAM(stdout) };
    }
    if (stdout.includes('AMD')) {
      return { type: 'amd', vram: parseVRAM(stdout) };
    }

    return { type: 'none', vram: 0 };
  } catch (error) {
    return { type: 'none', vram: 0 };
  }
}
```

#### Linux
```javascript
async function detectLinuxGPU() {
  // 1. 尝试 nvidia-smi
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits');
    const vram = Math.round(parseInt(stdout.trim()) / 1024); // MB -> GB
    return { type: 'nvidia', vram };
  } catch {}

  // 2. 尝试 rocm-smi (AMD)
  try {
    const { stdout } = await execAsync('rocm-smi --showmeminfo vram');
    const vramMatch = stdout.match(/(\d+)\s*MB/);
    const vram = vramMatch ? Math.round(parseInt(vramMatch[1]) / 1024) : 0;
    return { type: 'amd', vram };
  } catch {}

  // 3. 检查 /proc/driver/nvidia/version
  try {
    await fs.access('/proc/driver/nvidia/version');
    return { type: 'nvidia', vram: 0 }; // 驱动存在但无法获取显存
  } catch {}

  return { type: 'none', vram: 0 };
}
```

#### Windows
```javascript
async function detectWindowsGPU() {
  try {
    const { stdout } = await execAsync('wmic path win32_VideoController get Name,AdapterRAM');

    if (stdout.includes('NVIDIA')) {
      const vram = parseWindowsVRAM(stdout);
      return { type: 'nvidia', vram };
    }
    if (stdout.includes('AMD') || stdout.includes('Radeon')) {
      const vram = parseWindowsVRAM(stdout);
      return { type: 'amd', vram };
    }

    return { type: 'none', vram: 0 };
  } catch (error) {
    return { type: 'none', vram: 0 };
  }
}

function parseWindowsVRAM(output) {
  const match = output.match(/(\d+)/);
  if (match) {
    const bytes = parseInt(match[1]);
    return Math.round(bytes / (1024 ** 3)); // bytes -> GB
  }
  return 0;
}
```

## 边界情况处理

1. **命令执行失败**: 返回 `{ type: 'none', vram: 0 }`
2. **无法解析输出**: 返回默认值，不抛出异常
3. **权限不足**: 捕获错误，返回部分信息
4. **虚拟机环境**: 可能检测不到 GPU，返回 none
5. **多 GPU**: 只返回第一个 GPU 信息（M1 阶段）

## 错误处理

```javascript
export async function detect() {
  try {
    // ... 检测逻辑
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
```

## 依赖

```json
{
  "dependencies": {
    "node:os": "内置",
    "node:child_process": "内置",
    "node:util": "内置 (promisify)"
  }
}
```

## 测试用例

### test/detector/hardware.test.js

```javascript
import { describe, it, expect, vi } from 'vitest';
import { detect } from '../../src/detector/hardware.js';

describe('Hardware Detector', () => {
  it('should detect platform and arch', async () => {
    const result = await detect();
    expect(result.platform).toMatch(/darwin|linux|win32/);
    expect(result.arch).toMatch(/arm64|x64/);
  });

  it('should detect CPU info', async () => {
    const result = await detect();
    expect(result.cpu.cores).toBeGreaterThan(0);
    expect(result.cpu.model).toBeTruthy();
  });

  it('should detect memory in GB', async () => {
    const result = await detect();
    expect(result.memory).toBeGreaterThan(0);
  });

  it('should detect GPU type', async () => {
    const result = await detect();
    expect(['apple-silicon', 'nvidia', 'amd', 'none']).toContain(result.gpu.type);
    expect(result.gpu.vram).toBeGreaterThanOrEqual(0);
  });

  it('should handle detection errors gracefully', async () => {
    // Mock execAsync to throw error
    vi.mock('node:child_process', () => ({
      exec: vi.fn((cmd, cb) => cb(new Error('Command failed')))
    }));

    const result = await detect();
    expect(result.gpu.type).toBe('none');
  });
});
```

## 验收标准

- [ ] 在 macOS (Apple Silicon) 上返回 `gpu.type: 'apple-silicon'`
- [ ] 在 Linux + NVIDIA 上返回 `gpu.type: 'nvidia'` 和正确的 vram
- [ ] 在无 GPU 设备上返回 `gpu.type: 'none', vram: 0`
- [ ] 所有字段都存在且类型正确
- [ ] 命令失败时不抛出异常，返回默认值
- [ ] 执行时间 < 2s
