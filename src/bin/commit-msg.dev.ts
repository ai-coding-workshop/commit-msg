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
    .version(`${packageJson.name}: ${packageJson.version}`, '-v, --version')
    .exitOverride(async (err) => {
      // Check for updates when command fails for any reason
      const verbose = process.env.COMMIT_MSG_VERBOSE === 'true';
      if (verbose) {
        console.log(
          '\n🔍 Checking for updates (in case a newer version fixes this issue)...'
        );
      }
      try {
        await checkAndUpgrade({ verbose, silent: !verbose });
      } catch (updateError) {
        if (verbose) {
          console.log('Version check failed:', updateError);
        }
      }

      // Re-throw the error to maintain original behavior
      throw err;
    });

  program
    .command('install')
    .description('Install the commit-msg hook in the current Git repository')
    .option('-v, --verbose', 'Enable verbose output')
    .action(async (options) => {
      const verbose =
        options.verbose || process.env.COMMIT_MSG_VERBOSE === 'true';
      let success = false;

      try {
        await install();
        success = true;
        // Check for updates after successful installation
        try {
          await checkAndUpgrade({ verbose });
        } catch (updateError) {
          // Version check failure should not affect main command status
          if (verbose) {
            console.log('Version check failed:', updateError);
          }
        }
      } catch (error) {
        console.error(
          'Error installing commit-msg hook:',
          (error as Error).message
        );

        // Check for updates when install command fails
        if (verbose) {
          console.log(
            '\n🔍 Checking for updates (in case a newer version fixes this issue)...'
          );
        }
        try {
          await checkAndUpgrade({ verbose, silent: !verbose });
        } catch (updateError) {
          if (verbose) {
            console.log('Version check failed:', updateError);
          }
        }

        // Throw error instead of process.exit to allow update operations
        throw error;
      }
    });

  program
    .command('exec')
    .description('Execute the commit-msg hook logic')
    .argument('<message-file>', 'path to the commit message file')
    .option('-v, --verbose', 'Enable verbose output')
    .action(async (messageFile, options) => {
      const verbose =
        options.verbose || process.env.COMMIT_MSG_VERBOSE === 'true';
      let success = false;

      try {
        await exec(messageFile);
        success = true;
        // Check for updates after successful execution
        try {
          await checkAndUpgrade({ verbose });
        } catch (updateError) {
          // Version check failure should not affect main command status
          if (verbose) {
            console.log('Version check failed:', updateError);
          }
        }
      } catch (error) {
        console.error('Error processing commit message:', error);

        // Check for updates when exec command fails
        if (verbose) {
          console.log(
            '\n🔍 Checking for updates (in case a newer version fixes this issue)...'
          );
        }
        try {
          await checkAndUpgrade({ verbose, silent: !verbose });
        } catch (updateError) {
          if (verbose) {
            console.log('Version check failed:', updateError);
          }
        }

        // Throw error instead of process.exit to allow update operations
        throw error;
      }
    });

  // Add check-update command
  program
    .command('check-update')
    .description('Check for available updates')
    .option('-v, --verbose', 'Enable verbose output')
    .action(async (options) => {
      const verbose =
        options.verbose || process.env.COMMIT_MSG_VERBOSE === 'true';
      const hasUpdate = await checkForUpdatesOnly(verbose);
      if (!hasUpdate && !verbose) {
        console.log('✅ You are using the latest version');
      }
    });

  program.parse();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
