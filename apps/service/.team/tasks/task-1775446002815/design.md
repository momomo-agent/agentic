# Task: CLI 入口 + 一键安装 - Technical Design

## 目标
npx agentic-service 或全局安装，首次启动自动配置

## 文件结构
```
bin/
└── agentic-service.js    # CLI 入口
src/
└── cli/
    ├── setup.js          # 首次安装流程
    ├── spinner.js        # 进度显示工具
    └── browser.js        # 浏览器打开
package.json              # 配置 bin 字段
```

## 核心接口

### bin/agentic-service.js
```javascript
#!/usr/bin/env node

import { program } from 'commander';
import { runSetup } from '../src/cli/setup.js';
import { startServer } from '../src/server/api.js';
import { openBrowser } from '../src/cli/browser.js';
import chalk from 'chalk';

program
  .name('agentic-service')
  .description('AI agent service with hardware detection and auto-setup')
  .version('1.0.0')
  .option('-p, --port <port>', 'server port', '3000')
  .option('--no-browser', 'do not open browser automatically')
  .option('--skip-setup', 'skip first-time setup')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🚀 Agentic Service\n'));

      // 1. 首次安装检查
      if (!options.skipSetup) {
        const setupNeeded = await checkFirstRun();
        if (setupNeeded) {
          console.log(chalk.yellow('First run detected. Running setup...\n'));
          await runSetup();
        }
      }

      // 2. 启动服务器
      const port = parseInt(options.port);
      console.log(chalk.cyan(`Starting server on port ${port}...`));

      const server = await startServer(port);

      console.log(chalk.green(`✓ Server running at http://localhost:${port}\n`));

      // 3. 打开浏览器
      if (options.browser) {
        await openBrowser(`http://localhost:${port}`);
      }

      // 4. 优雅关闭
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\nShutting down...'));
        server.close(() => {
          console.log(chalk.green('✓ Server closed'));
          process.exit(0);
        });
      });

    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();

/**
 * 检查是否首次运行
 * @returns {Promise<boolean>}
 */
async function checkFirstRun() {
  const configPath = path.join(os.homedir(), '.agentic-service', 'config.json');
  try {
    await fs.access(configPath);
    return false; // 配置文件存在
  } catch {
    return true; // 配置文件不存在
  }
}
```

### src/cli/setup.js
```javascript
import ora from 'ora';
import chalk from 'chalk';
import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { setupOllama } from '../detector/optimizer.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * 首次安装流程
 */
export async function runSetup() {
  console.log(chalk.bold('Setup Wizard\n'));

  // 1. 检测硬件
  const hardwareSpinner = ora('Detecting hardware...').start();
  const hardware = await detect();
  hardwareSpinner.succeed('Hardware detected');

  console.log(chalk.gray(`  Platform: ${hardware.platform}`));
  console.log(chalk.gray(`  Arch: ${hardware.arch}`));
  console.log(chalk.gray(`  GPU: ${hardware.gpu.type} (${hardware.gpu.vram}GB)`));
  console.log(chalk.gray(`  Memory: ${hardware.memory}GB`));
  console.log(chalk.gray(`  CPU: ${hardware.cpu.model} (${hardware.cpu.cores} cores)\n`));

  // 2. 拉取配置推荐
  const profileSpinner = ora('Fetching recommended configuration...').start();
  const profile = await getProfile(hardware);
  profileSpinner.succeed('Configuration loaded');

  console.log(chalk.gray(`  LLM: ${profile.llm.provider} / ${profile.llm.model}`));
  console.log(chalk.gray(`  STT: ${profile.stt.provider} / ${profile.stt.model}`));
  console.log(chalk.gray(`  TTS: ${profile.tts.provider} / ${profile.tts.voice}`));
  if (profile.fallback) {
    console.log(chalk.gray(`  Fallback: ${profile.fallback.provider} / ${profile.fallback.model}\n`));
  }

  // 3. 设置 Ollama
  if (profile.llm.provider === 'ollama') {
    console.log(chalk.bold('Setting up Ollama...\n'));

    const ollamaStatus = await setupOllama(profile);

    if (ollamaStatus.needsInstall) {
      console.log(chalk.yellow('⚠ Ollama not found\n'));
      console.log(chalk.white('To install Ollama, run:'));
      console.log(chalk.cyan(`  ${ollamaStatus.installCommand}\n`));
      console.log(chalk.white('Or visit: https://ollama.com/download\n'));
      console.log(chalk.yellow('After installation, run this command again.\n'));
      process.exit(0);
    }

    if (ollamaStatus.ready) {
      console.log(chalk.green(`✓ Ollama ready with model ${ollamaStatus.model}\n`));
    } else {
      console.log(chalk.yellow(`⚠ Model ${ollamaStatus.model} may not be fully ready\n`));
    }
  }

  // 4. 保存配置
  const configSpinner = ora('Saving configuration...').start();
  await saveConfig({ hardware, profile });
  configSpinner.succeed('Configuration saved');

  console.log(chalk.green('\n✓ Setup complete!\n'));
}

/**
 * 保存配置到本地
 * @param {Object} config
 */
async function saveConfig(config) {
  const configDir = path.join(os.homedir(), '.agentic-service');
  const configPath = path.join(configDir, 'config.json');

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
```

### src/cli/browser.js
```javascript
import open from 'open';
import chalk from 'chalk';

/**
 * 打开浏览器
 * @param {string} url
 */
export async function openBrowser(url) {
  try {
    console.log(chalk.cyan(`Opening browser at ${url}...`));
    await open(url);
    console.log(chalk.green('✓ Browser opened\n'));
  } catch (error) {
    console.log(chalk.yellow(`⚠ Could not open browser automatically`));
    console.log(chalk.white(`Please visit: ${url}\n`));
  }
}
```

## package.json 配置

```json
{
  "name": "agentic-service",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "agentic-service": "./bin/agentic-service.js"
  },
  "scripts": {
    "start": "node bin/agentic-service.js",
    "dev": "node bin/agentic-service.js --skip-setup"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "ora": "^8.0.1",
    "chalk": "^5.3.0",
    "open": "^10.1.0",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "vitest": "^1.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "ai",
    "agent",
    "llm",
    "ollama",
    "chatbot"
  ],
  "files": [
    "bin",
    "src",
    "profiles",
    "README.md"
  ]
}
```

## 使用方式

### 方式 1: npx（推荐）
```bash
npx agentic-service
```

### 方式 2: 全局安装
```bash
npm install -g agentic-service
agentic-service
```

### 方式 3: 本地开发
```bash
git clone https://github.com/momomo-ai/agentic-service.git
cd agentic-service
npm install
npm start
```

## 命令行参数

```bash
# 指定端口
agentic-service --port 8080

# 不自动打开浏览器
agentic-service --no-browser

# 跳过首次安装（开发模式）
agentic-service --skip-setup

# 查看版本
agentic-service --version

# 查看帮助
agentic-service --help
```

## 首次启动流程示例

```
🚀 Agentic Service

First run detected. Running setup...

Setup Wizard

✓ Hardware detected
  Platform: darwin
  Arch: arm64
  GPU: apple-silicon (16GB)
  Memory: 16GB
  CPU: Apple M4 (10 cores)

✓ Configuration loaded
  LLM: ollama / gemma4:26b
  STT: sensevoice / small
  TTS: kokoro / default
  Fallback: openai / gpt-4o-mini

Setting up Ollama...

✓ Ollama found
✓ Model gemma4:26b available
✓ Model ready

✓ Configuration saved

✓ Setup complete!

Starting server on port 3000...
✓ Server running at http://localhost:3000

Opening browser at http://localhost:3000...
✓ Browser opened

Press Ctrl+C to stop
```

## 错误处理

### 端口占用
```
✗ Error: Port 3000 is already in use

Try:
  agentic-service --port 3001
```

### Ollama 未安装
```
⚠ Ollama not found

To install Ollama, run:
  brew install ollama

Or visit: https://ollama.com/download

After installation, run this command again.
```

### 网络错误
```
⚠ Could not fetch remote profiles
Using local default configuration
```

## 测试用例

### 单元测试 (test/cli/setup.test.js)
```javascript
import { describe, it, expect, vi } from 'vitest';
import { runSetup } from '../../src/cli/setup.js';
import * as hardware from '../../src/detector/hardware.js';
import * as profiles from '../../src/detector/profiles.js';

describe('setup.runSetup()', () => {
  it('should complete setup flow', async () => {
    vi.spyOn(hardware, 'detect').mockResolvedValue({
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 16,
      cpu: { cores: 10, model: 'Apple M4' }
    });

    vi.spyOn(profiles, 'getProfile').mockResolvedValue({
      llm: { provider: 'ollama', model: 'gemma4:26b' },
      stt: { provider: 'sensevoice', model: 'small' },
      tts: { provider: 'kokoro', voice: 'default' },
      fallback: { provider: 'openai', model: 'gpt-4o-mini' }
    });

    await expect(runSetup()).resolves.not.toThrow();
  });
});
```

### 集成测试
```bash
# 测试完整启动流程
npm link
agentic-service --skip-setup --no-browser --port 3001

# 验证服务可访问
curl http://localhost:3001/api/status
```

## 发布流程

### 1. 构建前端
```bash
cd src/ui/client
npm run build
```

### 2. 发布到 npm
```bash
npm version patch
npm publish
```

### 3. 验证发布
```bash
npx agentic-service@latest
```

## 性能要求
- CLI 启动 < 1s
- 首次安装（不含模型下载）< 30s
- 服务启动 < 3s
- 浏览器打开 < 2s

## 兼容性
- Node.js 18+
- macOS 12+
- Linux (Ubuntu 22.04+)
- Windows 10+ (部分功能)
