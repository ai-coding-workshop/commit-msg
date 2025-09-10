/**
 * Version checker utility with auto-upgrade functionality
 */

import updateNotifier from 'update-notifier';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const pkg = require('../../package.json');

interface UpdateInfo {
  current: string;
  latest: string;
  updateCommand: string;
}

/**
 * Check for updates and perform auto-upgrade if available
 * @param options Configuration options
 * @returns Promise that resolves when update check/upgrade is complete
 */
export async function checkAndUpgrade(
  options: {
    checkInterval?: number;
    autoUpgrade?: boolean;
    silent?: boolean;
  } = {}
): Promise<void> {
  const {
    checkInterval = 1000 * 60 * 60 * 24, // 24 hours
    autoUpgrade = true,
    silent = false,
  } = options;

  // Skip in CI/test environments
  if (process.env.CI || process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: checkInterval,
    });

    if (notifier.update) {
      const updateInfo: UpdateInfo = {
        current: notifier.update.current,
        latest: notifier.update.latest,
        updateCommand: getUpdateCommand(),
      };

      if (!silent) {
        console.log('\n🔄 New version available!');
        console.log(`Current version: ${updateInfo.current}`);
        console.log(`Latest version: ${updateInfo.latest}`);
      }

      if (autoUpgrade) {
        await performUpgrade(updateInfo, silent);
      } else {
        if (!silent) {
          console.log(
            `\nRun the following command to update: ${updateInfo.updateCommand}`
          );
        }
      }
    }
  } catch (error) {
    // Silently handle errors to not block main functionality
    if (!silent) {
      console.debug('Version check failed:', error);
    }
  }
}

/**
 * Get the appropriate update command based on installation method
 */
function getUpdateCommand(): string {
  try {
    // Check if installed globally
    execSync('npm list -g ' + pkg.name, { stdio: 'ignore' });
    return `npm update -g ${pkg.name}`;
  } catch {
    // Check if installed locally
    try {
      execSync('npm list ' + pkg.name, { stdio: 'ignore' });
      return `npm update ${pkg.name}`;
    } catch {
      // Fallback to install command
      return `npm install -g ${pkg.name}@latest`;
    }
  }
}

/**
 * Perform the actual upgrade
 */
async function performUpgrade(
  updateInfo: UpdateInfo,
  silent: boolean = false
): Promise<void> {
  return new Promise((resolve) => {
    if (!silent) {
      console.log(
        `\n🚀 Starting automatic upgrade to version ${updateInfo.latest}...`
      );
    }

    const command = updateInfo.updateCommand.split(' ');
    const [cmd, ...args] = command;

    const child = spawn(cmd, args, {
      stdio: silent ? 'ignore' : 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (!silent) {
          console.log(
            `\n✅ Upgrade completed! Current version: ${updateInfo.latest}`
          );
        }
      } else {
        if (!silent) {
          console.log(`\n❌ Upgrade failed with exit code: ${code}`);
          console.log(`Please run manually: ${updateInfo.updateCommand}`);
        }
      }
      resolve();
    });

    child.on('error', (error) => {
      if (!silent) {
        console.log(`\n❌ Error occurred during upgrade: ${error.message}`);
        console.log(`Please run manually: ${updateInfo.updateCommand}`);
      }
      resolve();
    });

    // Set a timeout to prevent hanging
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        if (!silent) {
          console.log(
            '\n⏰ Upgrade timeout, please run the update command manually'
          );
        }
        resolve();
      }
    }, 60000); // 60 seconds timeout
  });
}

/**
 * Check for updates without auto-upgrade (for version command)
 */
export async function checkForUpdatesOnly(): Promise<boolean> {
  try {
    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: 1000 * 60 * 60 * 24,
    });

    if (notifier.update) {
      console.log('\n🔄 New version available!');
      console.log(`Current version: ${notifier.update.current}`);
      console.log(`Latest version: ${notifier.update.latest}`);
      console.log(`Update command: ${getUpdateCommand()}`);
      return true;
    }
    return false;
  } catch (error) {
    console.debug('Version check failed:', error);
    return false;
  }
}

/**
 * Non-blocking version check (for background checking)
 */
export function checkForUpdatesAsync(): void {
  // Run in background without blocking
  setImmediate(() => {
    checkAndUpgrade({ silent: true }).catch(() => {
      // Silently handle errors
    });
  });
}
