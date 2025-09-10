#!/usr/bin/env node

// commit-msg CLI entry point

import { Command } from 'commander';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

// Import commands using relative paths
import { install } from '../commands/install.js';
import { exec } from '../commands/exec.js';

async function loadCommands() {
  return { install, exec };
}

async function main() {
  const { install, exec } = await loadCommands();

  const program = new Command();

  program
    .name('commit-msg')
    .description('CLI tool for managing Git commit-msg hooks')
    .version(`${packageJson.name}: ${packageJson.version}`, '-v, --version');

  program
    .command('install')
    .description('Install the commit-msg hook in the current Git repository')
    .action(async () => {
      try {
        await install();
      } catch (error) {
        console.error(
          'Error installing commit-msg hook:',
          (error as Error).message
        );
        process.exit(1);
      }
    });

  program
    .command('exec')
    .description('Execute the commit-msg hook logic')
    .argument('<message-file>', 'path to the commit message file')
    .action(exec);

  program.parse();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
