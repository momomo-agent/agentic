# Task: Fix optimizer.js hardware-adaptive config output

## Objective
Replace Ollama setup code in `optimizer.js` with hardware-adaptive config logic that reads detected hardware and returns optimized configuration for model selection and runtime tuning.

## Files to Modify

### 1. `src/detector/optimizer.js`

**Complete implementation:**

```javascript
import { detect } from './hardware.js';

class Optimizer {
  constructor() {
    this.hardware = null;
  }

  async initialize() {
    if (!this.hardware) {
      this.hardware = await detect();
    }
  }

  async getOptimizedConfig() {
    await this.initialize();

    const config = {
      hardware: this.hardware,
      llm: this.optimizeLLM(),
      stt: this.optimizeSTT(),
      tts: this.optimizeTTS(),
      runtime: this.optimizeRuntime()
    };

    return config;
  }

  optimizeLLM() {
    const { gpu, memory } = this.hardware;

    // Apple Silicon optimization
    if (gpu.type === 'apple-silicon') {
      if (memory >= 32) {
        return {
          provider: 'ollama',
          model: 'gemma2:27b',
          quantization: 'q8',
          contextLength: 8192,
          numGpu: 1
        };
      } else if (memory >= 16) {
        return {
          provider: 'ollama',
          model: 'gemma2:9b',
          quantization: 'q8',
          contextLength: 4096,
          numGpu: 1
        };
      }
    }

    // NVIDIA GPU optimization
    if (gpu.type === 'nvidia' && gpu.vram >= 8) {
      return {
        provider: 'ollama',
        model: 'gemma2:9b',
        quantization: 'q8',
        contextLength: 4096,
        numGpu: 1
      };
    }

    // CPU-only fallback
    return {
      provider: 'ollama',
      model: 'gemma2:2b',
      quantization: 'q4',
      contextLength: 2048,
      numGpu: 0,
      numThread: this.hardware.cpu.cores
    };
  }

  optimizeSTT() {
    const { gpu, memory } = this.hardware;

    if (gpu.type === 'apple-silicon' || (gpu.type === 'nvidia' && gpu.vram >= 4)) {
      return {
        provider: 'sensevoice',
        model: 'small',
        language: 'auto'
      };
    }

    // CPU fallback
    return {
      provider: 'whisper',
      model: 'tiny',
      language: 'en'
    };
  }

  optimizeTTS() {
    const { gpu } = this.hardware;

    if (gpu.type === 'apple-silicon' || gpu.type === 'nvidia') {
      return {
        provider: 'kokoro',
        voice: 'default',
        speed: 1.0
      };
    }

    // CPU fallback
    return {
      provider: 'piper',
      voice: 'en_US-lessac-medium',
      speed: 1.0
    };
  }

  optimizeRuntime() {
    const { memory, cpu } = this.hardware;

    return {
      maxConcurrentRequests: Math.min(cpu.cores, 4),
      streamingChunkSize: 512,
      cacheSize: Math.floor(memory * 0.1 * 1024), // 10% of RAM in MB
      workerThreads: Math.max(2, Math.floor(cpu.cores / 2))
    };
  }

  getRecommendations() {
    const { gpu, memory } = this.hardware;
    const recommendations = [];

    if (gpu.type === 'none') {
      recommendations.push({
        type: 'warning',
        message: 'No GPU detected. Performance will be limited. Consider using cloud fallback.'
      });
    }

    if (memory < 8) {
      recommendations.push({
        type: 'warning',
        message: 'Low memory detected. Recommend at least 8GB for optimal performance.'
      });
    }

    if (gpu.type === 'apple-silicon' && memory >= 32) {
      recommendations.push({
        type: 'info',
        message: 'Excellent hardware! Can run larger models with high performance.'
      });
    }

    return recommendations;
  }
}

export default Optimizer;

// Convenience export
export const getOptimizedConfig = async () => {
  const optimizer = new Optimizer();
  return await optimizer.getOptimizedConfig();
};
```

### 2. `test/detector/optimizer.test.js`

**Create comprehensive tests:**

```javascript
import { describe, it, expect, vi } from 'vitest';
import Optimizer from '../../src/detector/optimizer.js';

describe('Optimizer', () => {
  it('should optimize for Apple Silicon with 32GB RAM', async () => {
    const optimizer = new Optimizer();
    optimizer.hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 0 },
      memory: 32,
      cpu: { cores: 10, model: 'Apple M2 Max' }
    };

    const config = await optimizer.getOptimizedConfig();

    expect(config.llm.model).toBe('gemma2:27b');
    expect(config.llm.quantization).toBe('q8');
    expect(config.stt.provider).toBe('sensevoice');
  });

  it('should optimize for NVIDIA GPU', async () => {
    const optimizer = new Optimizer();
    optimizer.hardware = {
      platform: 'linux',
      arch: 'x64',
      gpu: { type: 'nvidia', vram: 12 },
      memory: 16,
      cpu: { cores: 8, model: 'Intel i7' }
    };

    const config = await optimizer.getOptimizedConfig();

    expect(config.llm.provider).toBe('ollama');
    expect(config.llm.numGpu).toBe(1);
  });

  it('should fallback to CPU-only config', async () => {
    const optimizer = new Optimizer();
    optimizer.hardware = {
      platform: 'linux',
      arch: 'x64',
      gpu: { type: 'none', vram: 0 },
      memory: 8,
      cpu: { cores: 4, model: 'Intel i5' }
    };

    const config = await optimizer.getOptimizedConfig();

    expect(config.llm.model).toBe('gemma2:2b');
    expect(config.llm.numGpu).toBe(0);
    expect(config.llm.numThread).toBe(4);
  });

  it('should provide recommendations', async () => {
    const optimizer = new Optimizer();
    optimizer.hardware = {
      gpu: { type: 'none' },
      memory: 4
    };

    const recommendations = optimizer.getRecommendations();

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some(r => r.type === 'warning')).toBe(true);
  });
});
```

## Algorithm

1. Detect hardware using `hardware.js`
2. Analyze GPU type, VRAM, RAM, CPU cores
3. Select optimal model based on available resources:
   - Apple Silicon + 32GB → gemma2:27b
   - Apple Silicon + 16GB → gemma2:9b
   - NVIDIA 8GB+ → gemma2:9b
   - CPU-only → gemma2:2b
4. Configure runtime parameters (threads, cache, concurrency)
5. Return complete config object

## Edge Cases

- **No GPU:** Use CPU-only config with smaller models
- **Low memory (<8GB):** Use quantized models, reduce context length
- **High-end hardware:** Enable larger models and higher concurrency
- **Unknown GPU:** Treat as CPU-only

## Error Handling

- Validate hardware detection results
- Provide sensible defaults if detection fails
- Log warnings for suboptimal configurations
- Never throw errors, always return valid config

## Dependencies

- `./hardware.js` for hardware detection
- No additional npm packages

## Test Cases

1. **Unit test:** Apple Silicon optimization
2. **Unit test:** NVIDIA GPU optimization
3. **Unit test:** CPU-only fallback
4. **Unit test:** Runtime parameter calculation
5. **Unit test:** Recommendations generation
6. **Integration test:** Full config generation

## Verification

```bash
# Run tests
npm test -- test/detector/optimizer.test.js

# Manual test
node -e "import('./src/detector/optimizer.js').then(async m => {
  const config = await m.getOptimizedConfig();
  console.log(JSON.stringify(config, null, 2));
})"
```
