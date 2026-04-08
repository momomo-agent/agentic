#!/usr/bin/env node

import { program } from 'commander';
import { createRequire } from 'module';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { runSetup, ensureModel } from '../src/cli/setup.js';
import { startServer, startDrain, waitDrain } from '../src/server/api.js';
import { openBrowser } from '../src/cli/browser.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

async function checkFirstRun() {
  try {
    await fs.access(CONFIG_PATH);
    return false;
  } catch {
    return true;
  }
}

program
  .name('agentic-service')
  .description('AI agent service with hardware detection and auto-setup')
  .version(version)
  .option('-p, --port <port>', 'server port', '1234')
  .option('--no-browser', 'do not open browser automatically')
  .option('--skip-setup', 'skip first-time setup')
  .option('--https', 'enable HTTPS with self-signed certificate')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🚀 Agentic Service\n'));

      let isFirstRun = false;
      if (!options.skipSetup) {
        isFirstRun = await checkFirstRun();
        if (isFirstRun) {
          console.log(chalk.yellow('First run detected. Running basic setup...\n'));
          // Only run hardware detection and config, skip model download
          await runSetup({ skipModelDownload: true });
        }
      }

      const port = parseInt(options.port);
      const useHttps = options.https || process.env.HTTPS_ENABLED === 'true';
      console.log(chalk.cyan(`Starting server on port ${port}...`));

      const server = await startServer(port, { https: useHttps });

      const proto = useHttps ? 'https' : 'http';
      console.log(chalk.green(`✓ Server running at ${proto}://localhost:${port}\n`));

      // Start model download in background (non-blocking)
      if (!options.skipSetup) {
        ensureModel().catch(err => {
          console.error(chalk.red(`Model setup failed: ${err.message}`));
        });
      }

      const proto = useHttps ? 'https' : 'http';
      console.log(chalk.green(`✓ Server running at ${proto}://localhost:${port}\n`));

      if (isFirstRun || options.browser) {
        await openBrowser(`${proto}://localhost:${port}`);
      }

      console.log(chalk.gray('Press Ctrl+C to stop'));

      function shutdown() {
        console.log(chalk.yellow('\n\nShutting down...'));
        startDrain();
        waitDrain(10_000).catch(() => {
          console.warn(chalk.yellow('Drain timeout exceeded, forcing exit'));
          process.exit(1);
        }).then(() => {
          const closing = server.http ? [server.http, server.https] : [server];
          let closed = 0;
          closing.forEach(s => s.close(() => {
            if (++closed === closing.length) {
              console.log(chalk.green('✓ Server closed'));
              process.exit(0);
            }
          }));
        });
      }

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
      if (error.message.includes('already in use')) {
        console.error(chalk.white(`\nTry:\n  agentic-service --port ${parseInt(options.port) + 1}`));
      }
      process.exit(1);
    }
  });

program.parse();
