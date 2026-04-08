import ora from 'ora';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execSync } from 'child_process';
import http from 'http';
import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { ensureSox } from '../detector/sox.js';

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
  const spinner = ora(`Pulling model ${model}...`).start();
  await new Promise((resolve, reject) => {
    const child = spawn('ollama', ['pull', model], { stdio: 'inherit' });
    child.on('close', code => {
      code === 0 ? spinner.succeed(`Model ${model} ready`) : reject(new Error(`pull failed: ${code}`));
      if (code === 0) resolve();
    });
  });
}

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

/**
 * Ensure Ollama is installed and recommended model is pulled.
 * Called on every startup (not just first run).
 */
export async function ensureModel() {
  const hardware = await detect();
  const profile = await getProfile(hardware);

  // Ensure sox is installed (for wake word detection)
  try {
    await ensureSox();
  } catch (err) {
    console.warn(chalk.yellow(`⚠ sox install skipped: ${err.message}`));
  }

  if (profile.llm.provider !== 'ollama') return;

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

  if (!await isModelPulled(profile.llm.model)) {
    await pullModel(profile.llm.model);
  }
}

export async function runSetup() {
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

  if (profile.llm.provider === 'ollama') {
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
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify({ hardware, profile }, null, 2));
  configSpinner.succeed('Configuration saved');

  console.log(chalk.green('\n✓ Setup complete!\n'));
}
