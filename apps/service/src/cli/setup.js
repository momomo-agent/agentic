import ora from 'ora';
import chalk from 'chalk';
import { spawn, execSync } from 'child_process';
import http from 'http';
import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { ensureSox } from '../detector/sox.js';
import { setDownloadState, clearDownloadState, getDownloadState } from './download-state.js';
import { initFromProfile, getConfig } from '../config.js';

async function isOllamaInstalled() {
  try { execSync('which ollama', { stdio: 'ignore' }); return true; } catch { return false; }
}

async function isModelPulled(model) {
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      const child = spawn('ollama', ['list'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let out = '';
      child.stdout.on('data', d => { out += d; });
      child.on('close', code => code === 0 ? resolve({ stdout: out }) : reject(new Error('ollama list failed')));
    });
    return stdout.split('\n').some(line => line.startsWith(model));
  } catch { return false; }
}

async function isOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:11434/api/version', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startOllama() {
  return new Promise((resolve, reject) => {
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    
    // Wait for Ollama to be ready
    let attempts = 0;
    const checkInterval = setInterval(async () => {
      if (await isOllamaRunning()) {
        clearInterval(checkInterval);
        resolve();
      } else if (++attempts > 30) { // 30 seconds timeout
        clearInterval(checkInterval);
        reject(new Error('Ollama failed to start'));
      }
    }, 1000);
  });
}

function getInstallCommand(platform) {
  if (platform === 'darwin') return 'brew install ollama';
  if (platform === 'linux') return 'curl -fsSL https://ollama.ai/install.sh | sh';
  throw new Error(`unsupported platform for auto-install: ${platform}`);
}

async function installOllama(cmd) {
  await new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', cmd], { stdio: 'inherit' });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`install failed: ${code}`)));
  });
}

async function pullModel(model) {
  setDownloadState({ inProgress: true, model, status: 'Starting...', progress: 0, total: 0 })
  const spinner = ora(`Pulling model ${model}...`).start();
  
  try {
    const config = await getConfig();
    const host = config.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    const response = await fetch(`${host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true })
    });

    if (!response.ok) throw new Error(`Ollama pull failed: HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.error) throw new Error(data.error);

          if (data.status) {
            const pct = data.total ? Math.round(data.completed / data.total * 100) : 0;
            const sizeStr = data.total ? ` (${(data.total / 1e9).toFixed(1)}GB)` : '';
            spinner.text = `Pulling ${model}: ${data.status}${pct ? ` ${pct}%` : ''}${sizeStr}`;

            if (data.status.includes('verifying') || data.status.includes('writing manifest')) {
              setDownloadState({ status: 'Finalizing...', progress: data.total || 0, total: data.total || 0 });
            } else {
              setDownloadState({ status: data.status, progress: data.completed || 0, total: data.total || 0 });
            }
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }

    spinner.succeed(`Model ${model} ready`);
    clearDownloadState();
  } catch (err) {
    spinner.fail(`Failed to pull ${model}: ${err.message}`);
    clearDownloadState();
    throw err;
  }
}


/**
 * Ensure Ollama is installed and recommended model is pulled.
 * Called on every startup (not just first run).
 */
export async function ensureModel() {
  let config = await getConfig();

  // 如果 config 是默认值（没有 config.json），先跑 profile 匹配
  if (config.llm.model === 'gemma2:2b' && !config._hardware) {
    const hardware = await detect();
    const profile = await getProfile(hardware);
    await initFromProfile(profile, hardware);
    config = await getConfig();
    console.log(chalk.gray(`[setup] auto-configured: ${config.llm.provider} / ${config.llm.model}`));
  }

  // Ensure sox is installed (for wake word detection)
  try {
    await ensureSox();
  } catch (err) {
    console.warn(chalk.yellow(`⚠ sox install skipped: ${err.message}`));
  }

  if (config.llm.provider !== 'ollama') return;

  const hardware = await detect();

  if (!await isOllamaInstalled()) {
    const spinner = ora('Installing Ollama...').start();
    await installOllama(getInstallCommand(hardware.platform));
    spinner.succeed('Ollama installed');
  }

  // Check if Ollama is running, start if not
  if (!await isOllamaRunning()) {
    const spinner = ora('Starting Ollama...').start();
    try {
      await startOllama();
      spinner.succeed('Ollama started');
    } catch (err) {
      spinner.fail('Failed to start Ollama');
      throw err;
    }
  }

  // Double-check Ollama is accessible before pulling
  if (!await isOllamaRunning()) {
    throw new Error('Ollama is not running. Please run "ollama serve" manually.');
  }

  if (!await isModelPulled(config.llm.model)) {
    await pullModel(config.llm.model);
  }
}

export async function runSetup(options = {}) {
  console.log(chalk.bold('Setup Wizard\n'));

  const hardwareSpinner = ora('Detecting hardware...').start();
  const hardware = await detect();
  hardwareSpinner.succeed('Hardware detected');
  console.log(chalk.gray(`  Platform: ${hardware.platform}`));
  console.log(chalk.gray(`  Arch: ${hardware.arch}`));
  console.log(chalk.gray(`  GPU: ${hardware.gpu.type} (${hardware.gpu.vram}GB)`));
  console.log(chalk.gray(`  Memory: ${hardware.memory}GB`));
  console.log(chalk.gray(`  CPU: ${hardware.cpu.model} (${hardware.cpu.cores} cores)\n`));

  const profileSpinner = ora('Fetching recommended configuration...').start();
  const profile = await getProfile(hardware);
  profileSpinner.succeed('Configuration loaded');
  console.log(chalk.gray(`  LLM: ${profile.llm.provider} / ${profile.llm.model}`));
  console.log(chalk.gray(`  STT: ${profile.stt.provider} / ${profile.stt.model}`));
  console.log(chalk.gray(`  TTS: ${profile.tts.provider} / ${profile.tts.voice}`));
  if (profile.fallback) {
    console.log(chalk.gray(`  Fallback: ${profile.fallback.provider} / ${profile.fallback.model}\n`));
  }

  if (!options.skipModelDownload && profile.llm.provider === 'ollama') {
    if (!await isOllamaInstalled()) {
      const spinner = ora('Installing Ollama...').start();
      await installOllama(getInstallCommand(hardware.platform));
      spinner.succeed('Ollama installed');
    }
    
    // Check if Ollama is running, start if not
    if (!await isOllamaRunning()) {
      const spinner = ora('Starting Ollama...').start();
      try {
        await startOllama();
        spinner.succeed('Ollama started');
      } catch (err) {
        spinner.fail('Failed to start Ollama');
        throw err;
      }
    }
    
    if (!await isModelPulled(profile.llm.model)) {
      await pullModel(profile.llm.model);
    } else {
      console.log(chalk.green(`✓ Model ${profile.llm.model} already present`));
    }
  }

  // Ensure sox is installed (for wake word detection)
  const soxSpinner = ora('Checking sox...').start();
  try {
    await ensureSox();
    soxSpinner.succeed('sox ready');
  } catch (err) {
    soxSpinner.warn(`sox install skipped: ${err.message}`);
  }

  const configSpinner = ora('Saving configuration...').start();
  await initFromProfile(profile, hardware);
  configSpinner.succeed('Configuration saved');

  console.log(chalk.green('\n✓ Setup complete!\n'));
}
