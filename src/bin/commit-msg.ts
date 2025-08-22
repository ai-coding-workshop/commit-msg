#!/usr/bin/env node

// commit-msg CLI entry point

import { Command } from 'commander';
import { install } from '../commands/install.js';
import { exec } from '../commands/exec.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

program
  .name('commit-msg')
  .description('CLI tool for managing Git commit-msg hooks')
  .version(version);

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
