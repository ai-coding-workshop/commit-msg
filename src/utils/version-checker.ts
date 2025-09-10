/**
 * Version checker utility with auto-upgrade functionality
 */

import updateNotifier from 'update-notifier';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
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
    verbose?: boolean;
  } = {}
): Promise<void> {
  const {
    checkInterval = 1000 * 60 * 60 * 24, // 24 hours
    autoUpgrade = true,
    silent = false,
    verbose = false,
  } = options;

  // Skip in CI/test environments
  if (process.env.CI || process.env.NODE_ENV === 'test') {
    if (verbose) {
      console.log('🔍 Skipping version check in CI/test environment');
    }
    return;
  }

  try {
    if (verbose) {
      console.log('🔍 Checking for updates...');
      console.log(`📦 Package: ${pkg.name}`);
      console.log(`📦 Current local version: ${pkg.version}`);
      console.log(`⏰ Check interval: ${checkInterval / 1000 / 60 / 60} hours`);
    }

    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: checkInterval,
    });

    // Check if we're using cached data or making a fresh request
    if (verbose) {
      const config = (
        notifier as unknown as { config: { get: (key: string) => unknown } }
      ).config;
      const lastCheck = config?.get?.('lastUpdateCheck');
      const checkIntervalHours = checkInterval / 1000 / 60 / 60;

      if (lastCheck && typeof lastCheck === 'number') {
        const timeSinceLastCheck = Date.now() - lastCheck;
        const hoursSinceLastCheck = timeSinceLastCheck / 1000 / 60 / 60;

        if (timeSinceLastCheck < checkInterval) {
          console.log(
            `📋 Using cached version data (last checked ${hoursSinceLastCheck.toFixed(1)}h ago, interval: ${checkIntervalHours}h)`
          );
        } else {
          console.log(
            `🌐 Cache expired, making fresh network request (last checked ${hoursSinceLastCheck.toFixed(1)}h ago, interval: ${checkIntervalHours}h)`
          );
        }
      } else {
        console.log(
          '🌐 No cache found, making fresh network request (first time check)'
        );
        console.log(
          `ℹ️  Note: update-notifier will cache results for ${checkIntervalHours}h to avoid frequent network requests`
        );
      }
    }

    if (notifier.update) {
      const updateInfo: UpdateInfo = {
        current: notifier.update.current,
        latest: notifier.update.latest,
        updateCommand: getUpdateCommand(),
      };

      if (verbose) {
        console.log('✅ Update found!');
        console.log(`📦 Package: ${pkg.name}`);
        console.log(`📦 Local version: ${updateInfo.current}`);
        console.log(`🌐 Remote version: ${updateInfo.latest}`);
        console.log(`🌐 Remote package: ${pkg.name}@${updateInfo.latest}`);
      }

      if (!silent) {
        console.log('\n🔄 New version available!');
        console.log(`Current version: ${updateInfo.current}`);
        console.log(`Latest version: ${updateInfo.latest}`);
      }

      if (autoUpgrade) {
        if (verbose) {
          console.log('🚀 Starting automatic upgrade...');
        }
        await performUpgrade(updateInfo, silent, verbose);
      } else {
        if (!silent) {
          console.log(
            `\nRun the following command to update: ${updateInfo.updateCommand}`
          );
        }
      }
    } else {
      if (verbose) {
        console.log('✅ You are using the latest version');
        console.log(`📦 Package: ${pkg.name}`);
        console.log(`📦 Local version: ${pkg.version}`);
        console.log(`🌐 Remote package: ${pkg.name}@${pkg.version} (latest)`);
      }
    }
  } catch (error) {
    // Silently handle errors to not block main functionality
    if (verbose) {
      console.log('❌ Version check failed:', error);
    } else if (!silent) {
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
  silent: boolean = false,
  verbose: boolean = false
): Promise<void> {
  return new Promise((resolve) => {
    if (verbose) {
      console.log(`📦 Update command: ${updateInfo.updateCommand}`);
    }

    if (!silent) {
      console.log(
        `\n🚀 Starting automatic upgrade to version ${updateInfo.latest}...`
      );
    }

    const command = updateInfo.updateCommand.split(' ');
    const [cmd, ...args] = command;

    if (verbose) {
      console.log(`🔧 Executing: ${cmd} ${args.join(' ')}`);
    }

    const child = spawn(cmd, args, {
      stdio: silent ? 'ignore' : 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (verbose) {
          console.log('✅ Upgrade process completed successfully');
        }
        if (!silent) {
          console.log(
            `\n✅ Upgrade completed! Current version: ${updateInfo.latest}`
          );
        }
      } else {
        if (verbose) {
          console.log(`❌ Upgrade process failed with exit code: ${code}`);
        }
        if (!silent) {
          console.log(`\n❌ Upgrade failed with exit code: ${code}`);
          console.log(`Please run manually: ${updateInfo.updateCommand}`);
        }
      }
      resolve();
    });

    child.on('error', (error) => {
      if (verbose) {
        console.log(`❌ Upgrade process error: ${error.message}`);
      }
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
        if (verbose) {
          console.log('⏰ Upgrade process timed out');
        }
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
export async function checkForUpdatesOnly(
  verbose: boolean = false
): Promise<boolean> {
  try {
    if (verbose) {
      console.log('🔍 Checking for updates...');
      console.log(`📦 Package: ${pkg.name}`);
      console.log(`📦 Current local version: ${pkg.version}`);
      console.log('⏰ Check interval: 24 hours');
    }

    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: 1000 * 60 * 60 * 24,
    });

    // Check if we're using cached data or making a fresh request
    if (verbose) {
      const config = (
        notifier as unknown as { config: { get: (key: string) => unknown } }
      ).config;
      const lastCheck = config?.get?.('lastUpdateCheck');

      if (lastCheck && typeof lastCheck === 'number') {
        const timeSinceLastCheck = Date.now() - lastCheck;
        const hoursSinceLastCheck = timeSinceLastCheck / 1000 / 60 / 60;

        if (timeSinceLastCheck < 24 * 60 * 60 * 1000) {
          console.log(
            `📋 Using cached version data (last checked ${hoursSinceLastCheck.toFixed(1)}h ago, interval: 24h)`
          );
        } else {
          console.log(
            `🌐 Cache expired, making fresh network request (last checked ${hoursSinceLastCheck.toFixed(1)}h ago, interval: 24h)`
          );
        }
      } else {
        console.log(
          '🌐 No cache found, making fresh network request (first time check)'
        );
        console.log(
          'ℹ️  Note: update-notifier will cache results for 24h to avoid frequent network requests'
        );
      }
    }

    if (notifier.update) {
      if (verbose) {
        console.log('✅ Update found!');
        console.log(`📦 Package: ${pkg.name}`);
        console.log(`📦 Local version: ${notifier.update.current}`);
        console.log(`🌐 Remote version: ${notifier.update.latest}`);
        console.log(`🌐 Remote package: ${pkg.name}@${notifier.update.latest}`);
      }
      console.log('\n🔄 New version available!');
      console.log(`Current version: ${notifier.update.current}`);
      console.log(`Latest version: ${notifier.update.latest}`);
      console.log(`Update command: ${getUpdateCommand()}`);
      return true;
    }

    if (verbose) {
      console.log('✅ You are using the latest version');
      console.log(`📦 Package: ${pkg.name}`);
      console.log(`📦 Local version: ${pkg.version}`);
      console.log(`🌐 Remote package: ${pkg.name}@${pkg.version} (latest)`);
    }
    return false;
  } catch (error) {
    if (verbose) {
      console.log('❌ Version check failed:', error);
    } else {
      console.debug('Version check failed:', error);
    }
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
