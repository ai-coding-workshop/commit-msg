/**
 * Version checker utility with auto-upgrade functionality
 */

import latestVersion from 'latest-version';
import semver from 'semver';
import { execSync, spawn } from 'child_process';
import { createRequire } from 'module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { homedir, platform } from 'os';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

/**
 * Detect if the running package is from a local project's node_modules.
 * If so, we must update the local project, not the global installation.
 * Returns { local: true, projectRoot } when running from node_modules of another project.
 */
function isRunningFromLocalProject(): { local: boolean; projectRoot?: string } {
  const currentFile = fileURLToPath(import.meta.url);
  const distDir = dirname(currentFile);
  // dist/utils/version-checker.js -> package root is ../../ from dist/
  const pkgRoot = join(distDir, '..', '..');
  const pkgRootNormalized = join(pkgRoot, 'package.json');

  if (!existsSync(pkgRootNormalized)) {
    return { local: false };
  }

  // Check if we're inside node_modules of a parent project
  const parts = pkgRoot.split(/[/\\]/);
  const nodeModulesIdx = parts.findIndex((p) => p === 'node_modules');
  if (nodeModulesIdx < 0) {
    // Running from project's own dist/ or from global - not a local dependency
    return { local: false };
  }

  // Project root is the directory containing node_modules
  const projectRoot = join(...parts.slice(0, nodeModulesIdx));
  const projectPackageJson = join(projectRoot, 'package.json');
  if (existsSync(projectPackageJson)) {
    return { local: true, projectRoot };
  }
  return { local: false };
}

interface UpdateInfo {
  current: string;
  latest: string;
  updateCommand: string;
  /** When updating local project, run npm in this directory */
  cwd?: string;
}

interface UpdateCache {
  lastUpdateCheck?: number;
}

const CACHE_FILE = 'commit-msg-update-cache.json';

function getCachePath(): string {
  const envOverride = process.env.XDG_CACHE_HOME;
  if (envOverride) {
    return join(envOverride, CACHE_FILE);
  }
  if (platform() === 'win32') {
    const base =
      process.env.LOCALAPPDATA ||
      join(homedir(), 'AppData', 'Local', 'commit-msg');
    return join(base, CACHE_FILE);
  }
  const base = join(homedir(), '.cache', 'commit-msg');
  return join(base, CACHE_FILE);
}

function getUpdateCache(): UpdateCache {
  try {
    const data = readFileSync(getCachePath(), 'utf8');
    return JSON.parse(data) as UpdateCache;
  } catch {
    return {};
  }
}

function setUpdateCache(cache: UpdateCache): void {
  const path = getCachePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cache));
}

/**
 * Format hours with a maximum of 4 decimal places
 */
function formatHours(hours: number): string {
  return hours.toFixed(4).replace(/\.?0+$/, '');
}

/**
 * Check for updates and perform auto-upgrade if available.
 * Uses latestVersion directly (like checkForUpdatesOnly) for reliable fetch;
 * update-notifier spawns async and never returns result in the same run.
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
    checkInterval = process.env.UPDATE_CHECK_INTERVAL
      ? parseInt(process.env.UPDATE_CHECK_INTERVAL, 10) * 1000
      : 1000 * 60 * 60, // 1 hour or from env var (in seconds)
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
      console.log(
        `⏰ Check interval: ${formatHours(checkInterval / 1000 / 60 / 60)} hours`
      );
    }

    const cache = getUpdateCache();
    const lastCheck = cache.lastUpdateCheck;
    const checkIntervalHours = checkInterval / 1000 / 60 / 60;

    if (verbose && lastCheck && typeof lastCheck === 'number') {
      const timeSinceLastCheck = Date.now() - lastCheck;
      const hoursSinceLastCheck = timeSinceLastCheck / 1000 / 60 / 60;

      if (timeSinceLastCheck < checkInterval) {
        console.log(
          `📋 Using cached version data (last checked ${formatHours(hoursSinceLastCheck)}h ago, interval: ${formatHours(checkIntervalHours)}h)`
        );
      } else {
        console.log(
          `🌐 Cache expired, making fresh network request (last checked ${formatHours(hoursSinceLastCheck)}h ago, interval: ${formatHours(checkIntervalHours)}h)`
        );
      }
    } else if (verbose && !lastCheck) {
      console.log(
        '🌐 No cache found, making fresh network request (first time check)'
      );
      console.log(
        `ℹ️  Note: results will be cached for ${checkIntervalHours}h to avoid frequent network requests`
      );
    }

    // Skip network request if within check interval
    if (lastCheck && typeof lastCheck === 'number') {
      const timeSinceLastCheck = Date.now() - lastCheck;
      if (timeSinceLastCheck < checkInterval) {
        if (verbose) {
          console.log('✅ Skipping check (within interval)');
        }
        return;
      }
    }

    // Fetch directly from npm registry for accurate result
    const remoteLatest = await latestVersion(pkg.name);
    setUpdateCache({ lastUpdateCheck: Date.now() });

    const hasUpdate = semver.gt(remoteLatest, pkg.version);

    if (hasUpdate) {
      const { command, cwd } = getUpdateCommand();
      const updateInfo: UpdateInfo = {
        current: pkg.version,
        latest: remoteLatest,
        updateCommand: command,
        cwd,
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
 * Get the appropriate update command based on where the package is running from.
 * Must update the installation that is actually executing, not a different one.
 */
function getUpdateCommand(): { command: string; cwd?: string } {
  const { local, projectRoot } = isRunningFromLocalProject();

  if (local && projectRoot) {
    // Running from project's node_modules: update the local project
    try {
      execSync('npm list ' + pkg.name, {
        stdio: 'ignore',
        cwd: projectRoot,
      });
    } catch {
      // Package not in package.json, install will add it
    }
    return {
      command: `npm install ${pkg.name}@latest --save-dev --yes --force`,
      cwd: projectRoot,
    };
  }

  // Running from global or standalone: update global installation
  // Use npm install -g @latest to force latest (npm update may not update to latest)
  return { command: `npm install -g ${pkg.name}@latest --yes --force` };
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

    const spawnOptions: Parameters<typeof spawn>[2] = {
      stdio: silent ? 'ignore' : 'inherit',
      shell: true,
      cwd: updateInfo.cwd,
      // Add non-interactive flags to prevent npm from waiting for user input
      env: {
        ...process.env,
        npm_config_yes: 'true',
        npm_config_force: 'true',
        // Prevent npm from asking for confirmation
        CI: 'true',
      },
    };

    const child = spawn(cmd, args, spawnOptions);

    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        if (!child.killed) {
          child.kill('SIGTERM');
        }
      }
    };

    child.on('close', (code) => {
      cleanup();
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
      cleanup();
      if (verbose) {
        console.log(`❌ Upgrade process error: ${error.message}`);
      }
      if (!silent) {
        console.log(`\n❌ Error occurred during upgrade: ${error.message}`);
        console.log(`Please run manually: ${updateInfo.updateCommand}`);
      }
      resolve();
    });

    // Handle process exit signals
    child.on('exit', (code, signal) => {
      cleanup();
      if (verbose) {
        console.log(
          `🔚 Upgrade process exited with code: ${code}, signal: ${signal}`
        );
      }
      resolve();
    });

    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        cleanup();
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

    // Clear timeout when process completes
    const originalResolve = resolve;
    resolve = () => {
      clearTimeout(timeoutId);
      originalResolve();
    };
  });
}

/**
 * Check for updates without auto-upgrade (for check-update command)
 * Uses latest-version directly for fresh fetch; update-notifier's check() spawns
 * async and never returns result in the same run.
 */
export async function checkForUpdatesOnly(
  verbose: boolean = false
): Promise<boolean> {
  try {
    const checkInterval = process.env.UPDATE_CHECK_INTERVAL
      ? parseInt(process.env.UPDATE_CHECK_INTERVAL, 10) * 1000
      : 1000 * 60 * 60; // 1 hour or from env var (in seconds)

    if (verbose) {
      console.log('🔍 Checking for updates...');
      console.log(`📦 Package: ${pkg.name}`);
      console.log(`📦 Current local version: ${pkg.version}`);
      console.log(
        `⏰ Check interval: ${formatHours(checkInterval / 1000 / 60 / 60)} hours`
      );
      console.log('🌐 Fetching latest version from npm registry...');
    }

    // Fetch directly from npm registry for accurate result
    const remoteLatest = await latestVersion(pkg.name);
    const hasUpdate = semver.gt(remoteLatest, pkg.version);

    if (hasUpdate) {
      if (verbose) {
        console.log('✅ Update found!');
        console.log(`📦 Package: ${pkg.name}`);
        console.log(`📦 Local version: ${pkg.version}`);
        console.log(`🌐 Remote version: ${remoteLatest}`);
        console.log(`🌐 Remote package: ${pkg.name}@${remoteLatest}`);
      }
      console.log('\n🔄 New version available!');
      console.log(`Current version: ${pkg.version}`);
      console.log(`Latest version: ${remoteLatest}`);
      console.log(`Update command: ${getUpdateCommand().command}`);
      return true;
    }

    if (verbose) {
      console.log('✅ You are using the latest version');
      console.log(`📦 Package: ${pkg.name}`);
      console.log(`📦 Local version: ${pkg.version}`);
      console.log(`🌐 Remote package: ${pkg.name}@${remoteLatest} (latest)`);
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
