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

async function loadCommands() {
  const { install } = await import('../commands/install.js');
  const { exec } = await import('../commands/exec.js');
  const { checkAndUpgrade, checkForUpdatesOnly } = await import(
    '../utils/version-checker.js'
  );
  return { install, exec, checkAndUpgrade, checkForUpdatesOnly };
}

// Helper function to determine verbose mode
function getVerboseMode(options: { verbose?: boolean } = {}): boolean {
  return options.verbose || process.env.COMMIT_MSG_VERBOSE === 'true';
}

// Helper function to handle install command with update checking
async function handleInstallCommand(
  verbose: boolean,
  install: () => Promise<void>,
  checkAndUpgrade: (options?: {
    checkInterval?: number;
    autoUpgrade?: boolean;
    silent?: boolean;
    verbose?: boolean;
  }) => Promise<void>
) {
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
}

// Helper function to handle exec command with update checking
async function handleExecCommand(
  messageFile: string,
  verbose: boolean,
  exec: (messageFile: string) => Promise<void>,
  checkAndUpgrade: (options?: {
    checkInterval?: number;
    autoUpgrade?: boolean;
    silent?: boolean;
    verbose?: boolean;
  }) => Promise<void>
) {
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
    .option('--verbose', 'Enable verbose output')
    .action(async (options) => {
      const verbose = getVerboseMode({ ...program.opts(), ...options });
      await handleInstallCommand(verbose, install, checkAndUpgrade);
    });

  program
    .command('exec')
    .description('Execute the commit-msg hook logic')
    .argument('<message-file>', 'path to the commit message file')
    .option('--verbose', 'Enable verbose output')
    .action(async (messageFile, options) => {
      const verbose = getVerboseMode({ ...program.opts(), ...options });
      await handleExecCommand(messageFile, verbose, exec, checkAndUpgrade);
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

  // Add default command to handle commit message file directly or run install when no args
  program
    .description('CLI tool for managing Git commit-msg hooks')
    .arguments('[message-file]')
    .action(async (messageFile, options) => {
      const verbose = getVerboseMode({ ...program.opts(), ...options });

      // If no message file is provided, run install command
      if (!messageFile) {
        await handleInstallCommand(verbose, install, checkAndUpgrade);
        return;
      }

      // Check if file exists
      const { existsSync } = await import('fs');
      if (!existsSync(messageFile)) {
        throw new CleanError(`Command or file not found: ${messageFile}`);
      }

      await handleExecCommand(messageFile, verbose, exec, checkAndUpgrade);
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
