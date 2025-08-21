#!/usr/bin/env node

// commit-msg CLI entry point

import { Command } from 'commander';
import { install } from '../commands/install';
import { exec } from '../commands/exec';

const program = new Command();

program
  .name('commit-msg')
  .description('CLI tool for managing Git commit-msg hooks')
  .version('1.0.0');

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
