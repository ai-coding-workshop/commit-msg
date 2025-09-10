#!/usr/bin/env node

// commit-msg CLI entry point for development

import { Command } from 'commander';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

async function loadCommands() {
  // Dynamically import commands for development
  const { install } = await import('../commands/install.ts');
  const { exec } = await import('../commands/exec.ts');
  const { checkAndUpgrade, checkForUpdatesOnly } = await import(
    '../utils/version-checker.ts'
  );
  return { install, exec, checkAndUpgrade, checkForUpdatesOnly };
}

async function main() {
  const { install, exec, checkAndUpgrade, checkForUpdatesOnly } =
    await loadCommands();

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
        // Check for updates after successful installation
        await checkAndUpgrade();
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
    .action(async (messageFile) => {
      try {
        await exec(messageFile);
        // Check for updates after successful execution
        await checkAndUpgrade();
      } catch (error) {
        console.error('Error processing commit message:', error);
        process.exit(1);
      }
    });

  // Add check-update command
  program
    .command('check-update')
    .description('Check for available updates')
    .action(async () => {
      const hasUpdate = await checkForUpdatesOnly();
      if (!hasUpdate) {
        console.log('✅ You are using the latest version');
      }
    });

  program.parse();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
