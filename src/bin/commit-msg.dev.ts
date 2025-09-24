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

// Helper function to determine verbose mode
function getVerboseMode(options: { verbose?: boolean } = {}): boolean {
  return options.verbose || process.env.COMMIT_MSG_VERBOSE === 'true';
}

async function main() {
  const { install, exec, checkAndUpgrade, checkForUpdatesOnly } =
    await loadCommands();

  const program = new Command();

  program
    .name('commit-msg')
    .description('CLI tool for managing Git commit-msg hooks')
    .version(`${packageJson.name}: ${packageJson.version}`, '-v, --version')
    .option('--verbose', 'Enable verbose output')
    .exitOverride(async (err) => {
      // Check for updates when command fails for any reason
      const verbose = getVerboseMode(program.opts());
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
      const verbose = getVerboseMode({ ...program.opts(), ...options });

      try {
        await install();
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
      const verbose = getVerboseMode({ ...program.opts(), ...options });

      try {
        await exec(messageFile);
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
    .option('--verbose', 'Enable verbose output', true) // Set verbose as default
    .option('--no-verbose', 'Disable verbose output') // Allow disabling verbose
    .action(async (options) => {
      const verbose = getVerboseMode({ ...program.opts(), ...options });
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
