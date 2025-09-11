#!/usr/bin/env node

// commit-msg CLI entry point

import { Command } from 'commander';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

// Custom error class to avoid stack trace display
class CleanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CleanError';
    // Capture stack trace but remove it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CleanError);
    }
    // Override stack to be just the message
    this.stack = `${this.name}: ${this.message}`;
  }
}

// Suppress stack trace for uncaught exceptions
process.on('uncaughtException', (error) => {
  if (error instanceof CleanError) {
    console.error('Error:', error.message);
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  if (reason instanceof CleanError) {
    console.error('Error:', reason.message);
  } else {
    console.error('Error:', reason);
  }
  process.exit(1);
});

// Import commands using relative paths
import { install } from '../commands/install.js';
import { exec } from '../commands/exec.js';
import {
  checkAndUpgrade,
  checkForUpdatesOnly,
} from '../utils/version-checker.js';

async function loadCommands() {
  return { install, exec };
}

// Helper function to determine verbose mode
function getVerboseMode(options: { verbose?: boolean } = {}): boolean {
  return options.verbose || process.env.COMMIT_MSG_VERBOSE === 'true';
}

async function main() {
  const { install, exec } = await loadCommands();

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

        // Throw clean error to trigger exitOverride for update check
        throw new CleanError((error as Error).message);
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

        // Throw clean error to trigger exitOverride for update check
        throw new CleanError((error as Error).message);
      }
    });

  // Add check-update command
  program
    .command('check-update')
    .description('Check for available updates')
    .option('-v, --verbose', 'Enable verbose output')
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
  // Suppress stack trace for CleanError
  if (error instanceof CleanError) {
    console.error('Error:', error.message);
  } else {
    // For other errors, only show the message
    console.error('Error:', (error as Error).message);
  }
  process.exit(1);
});
