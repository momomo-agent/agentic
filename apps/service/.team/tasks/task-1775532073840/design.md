# Task: Add cpu-only profile to profiles/default.json

## Objective
Add a cpu-only hardware profile entry to `profiles/default.json` alongside existing apple-silicon and nvidia profiles, with conservative model and runtime settings for CPU-only machines.

## Files to Modify

### 1. `profiles/default.json`

**Add cpu-only profile:**

```json
{
  "version": "1.0.0",
  "profiles": [
    {
      "id": "apple-silicon-32gb",
      "match": {
        "platform": "darwin",
        "arch": "arm64",
        "gpu": "apple-silicon",
        "memory": { "min": 32 }
      },
      "config": {
        "llm": {
          "provider": "ollama",
          "model": "gemma2:27b",
          "quantization": "q8",
          "contextLength": 8192,
          "numGpu": 1
        },
        "stt": {
          "provider": "sensevoice",
          "model": "small"
        },
        "tts": {
          "provider": "kokoro",
          "voice": "default"
        }
      }
    },
    {
      "id": "apple-silicon-16gb",
      "match": {
        "platform": "darwin",
        "arch": "arm64",
        "gpu": "apple-silicon",
        "memory": { "min": 16, "max": 31 }
      },
      "config": {
        "llm": {
          "provider": "ollama",
          "model": "gemma2:9b",
          "quantization": "q8",
          "contextLength": 4096,
          "numGpu": 1
        },
        "stt": {
          "provider": "sensevoice",
          "model": "small"
        },
        "tts": {
          "provider": "kokoro",
          "voice": "default"
        }
      }
    },
    {
      "id": "nvidia-8gb",
      "match": {
        "gpu": "nvidia",
        "vram": { "min": 8 }
      },
      "config": {
        "llm": {
          "provider": "ollama",
          "model": "gemma2:9b",
          "quantization": "q8",
          "contextLength": 4096,
          "numGpu": 1
        },
        "stt": {
          "provider": "sensevoice",
          "model": "small"
        },
        "tts": {
          "provider": "kokoro",
          "voice": "default"
        }
      }
    },
    {
      "id": "cpu-only",
      "match": {
        "gpu": "none"
      },
      "config": {
        "llm": {
          "provider": "ollama",
          "model": "gemma2:2b",
          "quantization": "q4",
          "contextLength": 2048,
          "numGpu": 0,
          "numThread": "auto"
        },
        "stt": {
          "provider": "whisper",
          "model": "tiny",
          "language": "en"
        },
        "tts": {
          "provider": "piper",
          "voice": "en_US-lessac-medium",
          "speed": 1.0
        },
        "runtime": {
          "maxConcurrentRequests": 2,
          "streamingChunkSize": 256,
          "cacheSize": 512
        },
        "fallback": {
          "enabled": true,
          "provider": "openai",
          "model": "gpt-4o-mini",
          "note": "Cloud fallback recommended for CPU-only systems"
        }
      }
    }
  ],
  "fallback": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

### 2. `src/detector/profiles.js`

**Update profile matching logic:**

```javascript
export function matchProfile(hardware, profiles) {
  // Try to match specific profiles first
  for (const profile of profiles) {
    if (isMatch(hardware, profile.match)) {
      return profile;
    }
  }

  // Fallback to cpu-only profile
  const cpuOnlyProfile = profiles.find(p => p.id === 'cpu-only');
  if (cpuOnlyProfile) {
    console.log('[PROFILES] Using cpu-only fallback profile');
    return cpuOnlyProfile;
  }

  throw new Error('No matching profile found');
}

function isMatch(hardware, match) {
  // Check platform
  if (match.platform && hardware.platform !== match.platform) {
    return false;
  }

  // Check architecture
  if (match.arch && hardware.arch !== match.arch) {
    return false;
  }

  // Check GPU type
  if (match.gpu && hardware.gpu.type !== match.gpu) {
    return false;
  }

  // Check memory range
  if (match.memory) {
    if (match.memory.min && hardware.memory < match.memory.min) {
      return false;
    }
    if (match.memory.max && hardware.memory > match.memory.max) {
      return false;
    }
  }

  // Check VRAM range
  if (match.vram) {
    if (match.vram.min && hardware.gpu.vram < match.vram.min) {
      return false;
    }
    if (match.vram.max && hardware.gpu.vram > match.vram.max) {
      return false;
    }
  }

  return true;
}
```

### 3. `test/detector/profiles.test.js`

**Add test for cpu-only profile:**

```javascript
import { describe, it, expect } from 'vitest';
import { getProfile } from '../../src/detector/profiles.js';

describe('Profiles', () => {
  it('should match cpu-only profile for no GPU', async () => {
    const hardware = {
      platform: 'linux',
      arch: 'x64',
      gpu: { type: 'none', vram: 0 },
      memory: 8,
      cpu: { cores: 4 }
    };

    const profile = await getProfile(hardware);

    expect(profile.id).toBe('cpu-only');
    expect(profile.config.llm.model).toBe('gemma2:2b');
    expect(profile.config.llm.numGpu).toBe(0);
    expect(profile.config.fallback.enabled).toBe(true);
  });

  it('should use cpu-only as ultimate fallback', async () => {
    const hardware = {
      platform: 'unknown',
      arch: 'unknown',
      gpu: { type: 'unknown', vram: 0 },
      memory: 4,
      cpu: { cores: 2 }
    };

    const profile = await getProfile(hardware);

    expect(profile.id).toBe('cpu-only');
  });
});
```

## Profile Specifications

### CPU-Only Profile Details

**Model Selection:**
- LLM: gemma2:2b with q4 quantization (smallest viable model)
- STT: Whisper tiny (fastest CPU-based STT)
- TTS: Piper (efficient CPU-based TTS)

**Runtime Settings:**
- Max concurrent requests: 2 (avoid overload)
- Streaming chunk size: 256 (smaller for responsiveness)
- Cache size: 512MB (conservative)
- Thread count: auto (use all available CPU cores)

**Fallback Strategy:**
- Cloud fallback enabled by default
- Recommend OpenAI API for better performance
- Provide clear messaging about limitations

## Edge Cases

- **Very low memory (<4GB):** Profile still works but with warnings
- **Single-core CPU:** Reduce concurrency to 1
- **No internet:** Local models still work, just slower
- **Profile not found:** cpu-only serves as ultimate fallback

## Error Handling

- Validate profile JSON structure on load
- Provide clear error messages if profile invalid
- Log which profile was matched and why
- Never fail to return a profile (cpu-only is always available)

## Dependencies

- No additional dependencies

## Test Cases

1. **Unit test:** cpu-only profile matches no-GPU hardware
2. **Unit test:** cpu-only serves as fallback for unknown hardware
3. **Unit test:** Profile JSON is valid and parseable
4. **Integration test:** Full profile matching flow

## Verification

```bash
# Validate JSON
cat profiles/default.json | jq .

# Run tests
npm test -- test/detector/profiles.test.js

# Manual test
node -e "import('./src/detector/profiles.js').then(async m => {
  const profile = await m.getProfile({
    gpu: { type: 'none' },
    memory: 8,
    cpu: { cores: 4 }
  });
  console.log('Matched profile:', profile.id);
})"
```
