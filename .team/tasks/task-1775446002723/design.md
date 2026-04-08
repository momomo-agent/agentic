# Task: Ollama 集成 - Technical Design

## 目标
自动检测/安装 Ollama，拉取推荐模型，显示进度。

## 文件清单

### 新建文件
- `src/detector/optimizer.js` - Ollama 检测和安装
- `src/runtime/ollama-installer.js` - 安装逻辑
- `test/detector/optimizer.test.js` - 单元测试

## 函数签名

### src/detector/optimizer.js

```javascript
/**
 * 检查并设置 Ollama
 * @param {ProfileConfig} profile - 推荐配置
 * @returns {Promise<OllamaStatus>}
 */
export async function setupOllama(profile) {
  // 返回格式：
  // {
  //   installed: boolean,
  //   version: string | null,
  //   modelReady: boolean,
  //   modelName: string
  // }
}

/**
 * 检测 Ollama 是否已安装
 * @returns {Promise<{installed: boolean, version: string | null}>}
 */
async function detectOllama() {}

/**
 * 检查模型是否已存在
 * @param {string} modelName - 模型名称（如 gemma4:26b）
 * @returns {Promise<boolean>}
 */
async function checkModelExists(modelName) {}

/**
 * 拉取模型
 * @param {string} modelName
 * @param {Function} onProgress - 进度回调 (percent, speed)
 * @returns {Promise<void>}
 */
async function pullModel(modelName, onProgress) {}

/**
 * 提示用户安装 Ollama
 * @param {string} platform
 * @returns {void}
 */
function promptInstallation(platform) {}
```

## 实现逻辑

### 1. 主流程 (setupOllama)

```javascript
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import ora from 'ora';
import chalk from 'chalk';

const execAsync = promisify(exec);

export async function setupOllama(profile) {
  // 1. 检测 Ollama
  const spinner = ora('Checking Ollama installation...').start();
  const { installed, version } = await detectOllama();

  if (!installed) {
    spinner.fail('Ollama not installed');
    promptInstallation(process.platform);
    return {
      installed: false,
      version: null,
      modelReady: false,
      modelName: profile.llm.model
    };
  }

  spinner.succeed(`Ollama ${version} detected`);

  // 2. 检查模型
  const modelName = profile.llm.model;
  spinner.start(`Checking model: ${modelName}...`);
  const modelExists = await checkModelExists(modelName);

  if (modelExists) {
    spinner.succeed(`Model ${modelName} ready`);
    return {
      installed: true,
      version,
      modelReady: true,
      modelName
    };
  }

  // 3. 拉取模型
  spinner.info(`Model ${modelName} not found, pulling...`);

  try {
    await pullModel(modelName, (percent, speed) => {
      spinner.text = `Pulling ${modelName}: ${percent}% (${speed})`;
    });
    spinner.succeed(`Model ${modelName} pulled successfully`);

    return {
      installed: true,
      version,
      modelReady: true,
      modelName
    };
  } catch (error) {
    spinner.fail(`Failed to pull model: ${error.message}`);
    return {
      installed: true,
      version,
      modelReady: false,
      modelName
    };
  }
}
```

### 2. Ollama 检测

```javascript
async function detectOllama() {
  try {
    const { stdout } = await execAsync('ollama --version');
    const versionMatch = stdout.match(/ollama version is ([\d.]+)/i) ||
                        stdout.match(/([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return { installed: true, version };
  } catch (error) {
    return { installed: false, version: null };
  }
}
```

### 3. 模型检查

```javascript
async function checkModelExists(modelName) {
  try {
    const { stdout } = await execAsync('ollama list');
    // 输出格式：
    // NAME                    ID              SIZE      MODIFIED
    // gemma4:26b             abc123          15 GB     2 days ago

    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.startsWith(modelName)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}
```

### 4. 模型拉取

```javascript
import { spawn } from 'node:child_process';

async function pullModel(modelName, onProgress) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['pull', modelName]);

    let lastPercent = 0;

    proc.stdout.on('data', (data) => {
      const output = data.toString();

      // 解析进度
      // 输出格式：pulling manifest
      //          pulling 4f1c3f54... 100% ▕████████████████▏ 1.2 GB/1.2 GB  50 MB/s
      //          verifying sha256 digest
      //          writing manifest
      //          success

      const progressMatch = output.match(/(\d+)%.*?([\d.]+\s*[KMG]B\/s)/);
      if (progressMatch) {
        const percent = parseInt(progressMatch[1]);
        const speed = progressMatch[2];

        if (percent !== lastPercent) {
          lastPercent = percent;
          onProgress(percent, speed);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      console.error('Ollama stderr:', data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ollama pull exited with code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}
```

### 5. 安装提示

```javascript
function promptInstallation(platform) {
  console.log(chalk.yellow('\n⚠️  Ollama is not installed\n'));

  switch (platform) {
    case 'darwin':
      console.log(chalk.cyan('Install with Homebrew:'));
      console.log(chalk.white('  brew install ollama\n'));
      console.log(chalk.cyan('Or download from:'));
      console.log(chalk.white('  https://ollama.ai/download/mac\n'));
      break;

    case 'linux':
      console.log(chalk.cyan('Install with:'));
      console.log(chalk.white('  curl -fsSL https://ollama.ai/install.sh | sh\n'));
      break;

    case 'win32':
      console.log(chalk.cyan('Download installer from:'));
      console.log(chalk.white('  https://ollama.ai/download/windows\n'));
      break;

    default:
      console.log(chalk.cyan('Visit:'));
      console.log(chalk.white('  https://ollama.ai/download\n'));
  }

  console.log(chalk.gray('After installation, run this command again.\n'));
}
```

## 边界情况处理

1. **Ollama 未安装**: 显示安装指引，不阻塞启动（使用 fallback）
2. **模型拉取失败**: 显示错误，继续启动（使用 fallback）
3. **网络慢**: 显示实时进度和速度
4. **磁盘空间不足**: 捕获错误，提示用户
5. **Ollama 服务未启动**: 尝试启动 `ollama serve`
6. **模型名称错误**: 提示可用模型列表

## 错误处理

```javascript
export async function setupOllama(profile) {
  try {
    // ... 主逻辑
  } catch (error) {
    console.error(chalk.red('Ollama setup failed:'), error.message);
    console.log(chalk.yellow('Falling back to cloud API\n'));

    return {
      installed: false,
      version: null,
      modelReady: false,
      modelName: profile.llm.model
    };
  }
}
```

## 依赖

```json
{
  "dependencies": {
    "ora": "^7.0.1",
    "chalk": "^5.3.0"
  }
}
```

## 测试用例

### test/detector/optimizer.test.js

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupOllama } from '../../src/detector/optimizer.js';

describe('Ollama Setup', () => {
  const mockProfile = {
    llm: {
      provider: 'ollama',
      model: 'gemma4:26b',
      quantization: 'q8'
    }
  };

  it('should detect installed Ollama', async () => {
    // Mock execAsync to return version
    vi.mock('node:child_process', () => ({
      exec: vi.fn((cmd, cb) => {
        if (cmd === 'ollama --version') {
          cb(null, { stdout: 'ollama version is 0.1.26' });
        }
      })
    }));

    const result = await setupOllama(mockProfile);
    expect(result.installed).toBe(true);
    expect(result.version).toBe('0.1.26');
  });

  it('should detect missing Ollama', async () => {
    vi.mock('node:child_process', () => ({
      exec: vi.fn((cmd, cb) => {
        cb(new Error('command not found'));
      })
    }));

    const result = await setupOllama(mockProfile);
    expect(result.installed).toBe(false);
  });

  it('should check if model exists', async () => {
    vi.mock('node:child_process', () => ({
      exec: vi.fn((cmd, cb) => {
        if (cmd === 'ollama list') {
          cb(null, { stdout: 'gemma4:26b    abc123    15 GB    2 days ago' });
        }
      })
    }));

    const result = await setupOllama(mockProfile);
    expect(result.modelReady).toBe(true);
  });

  it('should handle model pull failure', async () => {
    vi.mock('node:child_process', () => ({
      spawn: vi.fn(() => ({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(1); // exit code 1
        })
      }))
    }));

    const result = await setupOllama(mockProfile);
    expect(result.modelReady).toBe(false);
  });
});
```

## 进度显示示例

```
✔ Ollama 0.1.26 detected
ℹ Model gemma4:26b not found, pulling...
⠋ Pulling gemma4:26b: 45% (52 MB/s)
```

## 验收标准

- [ ] 能检测 Ollama 是否已安装
- [ ] 未安装时显示平台特定的安装指引
- [ ] 能检查模型是否存在（ollama list）
- [ ] 模型不存在时自动拉取
- [ ] 显示下载进度（百分比 + 速度）
- [ ] 拉取失败时显示错误并继续启动
- [ ] 不阻塞服务启动（可使用 fallback）
