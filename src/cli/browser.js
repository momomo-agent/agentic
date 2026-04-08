import chalk from 'chalk';

export async function openBrowser(url) {
  try {
    console.log(chalk.cyan(`Opening browser at ${url}...`));
    const { default: open } = await import('open');
    await open(url);
    console.log(chalk.green('✓ Browser opened\n'));
  } catch {
    console.log(chalk.yellow('⚠ Could not open browser automatically'));
    console.log(chalk.white(`Please visit: ${url}\n`));
  }
}
