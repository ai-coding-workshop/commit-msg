import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  checkAndUpgrade,
  checkForUpdatesOnly,
} from '../src/utils/version-checker';

// Get current version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);
const currentVersion = packageJson.version;

// Mock latest-version (used by both checkForUpdatesOnly and checkAndUpgrade)
vi.mock('latest-version', () => ({
  default: vi.fn(() => Promise.resolve(currentVersion)),
}));

describe('Version Checker', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset latest-version mock to return current (no update)
    const mockLatestVersion = await import('latest-version');
    vi.mocked(mockLatestVersion.default).mockResolvedValue(currentVersion);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('checkForUpdatesOnly', () => {
    it('should return false when no update is available', async () => {
      const hasUpdate = await checkForUpdatesOnly();
      expect(hasUpdate).toBe(false);
    });

    it('should return false when no update is available with verbose output', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const hasUpdate = await checkForUpdatesOnly(true);

      expect(hasUpdate).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Checking for updates...');
      expect(consoleSpy).toHaveBeenCalledWith(
        `📦 Current local version: ${currentVersion}`
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ You are using the latest version'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        `📦 Local version: ${currentVersion}`
      );

      consoleSpy.mockRestore();
    });

    it('should return true and display update info when update is available', async () => {
      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockResolvedValue('99.0.0');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const hasUpdate = await checkForUpdatesOnly();

      expect(hasUpdate).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('\n🔄 New version available!');
      expect(consoleSpy).toHaveBeenCalledWith(
        `Current version: ${currentVersion}`
      );
      expect(consoleSpy).toHaveBeenCalledWith('Latest version: 99.0.0');

      consoleSpy.mockRestore();
    });

    it('should return true and display verbose update info when update is available', async () => {
      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockResolvedValue('99.0.0');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const hasUpdate = await checkForUpdatesOnly(true);

      expect(hasUpdate).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Checking for updates...');
      expect(consoleSpy).toHaveBeenCalledWith(
        `📦 Current local version: ${currentVersion}`
      );
      expect(consoleSpy).toHaveBeenCalledWith('✅ Update found!');
      expect(consoleSpy).toHaveBeenCalledWith(
        `📦 Local version: ${currentVersion}`
      );
      expect(consoleSpy).toHaveBeenCalledWith('🌐 Remote version: 99.0.0');
      expect(consoleSpy).toHaveBeenCalledWith('\n🔄 New version available!');
      expect(consoleSpy).toHaveBeenCalledWith(
        `Current version: ${currentVersion}`
      );
      expect(consoleSpy).toHaveBeenCalledWith('Latest version: 99.0.0');

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockRejectedValue(
        new Error('Network error')
      );

      const consoleSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});

      const hasUpdate = await checkForUpdatesOnly();

      expect(hasUpdate).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Version check failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully with verbose output', async () => {
      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockRejectedValue(
        new Error('Network error')
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const hasUpdate = await checkForUpdatesOnly(true);

      expect(hasUpdate).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Checking for updates...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Version check failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('checkAndUpgrade', () => {
    it('should skip check in CI environment', async () => {
      process.env.CI = 'true';

      const mockLatestVersion = await import('latest-version');

      await checkAndUpgrade();

      expect(mockLatestVersion.default).not.toHaveBeenCalled();
    });

    it('should skip check in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const mockLatestVersion = await import('latest-version');

      await checkAndUpgrade();

      expect(mockLatestVersion.default).not.toHaveBeenCalled();
    });

    it('should handle errors silently', async () => {
      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockRejectedValue(
        new Error('Network error')
      );

      // In silent mode, errors are handled silently without console output
      await expect(
        checkAndUpgrade({ silent: true, verbose: false })
      ).resolves.not.toThrow();
    });

    it('should show verbose output when update is available', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockResolvedValue('99.0.0');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await checkAndUpgrade({
          verbose: true,
          autoUpgrade: false,
          checkInterval: 0,
        });

        expect(consoleSpy).toHaveBeenCalledWith('🔍 Checking for updates...');
        expect(consoleSpy).toHaveBeenCalledWith(
          `📦 Current local version: ${currentVersion}`
        );
        expect(consoleSpy).toHaveBeenCalledWith('✅ Update found!');
        expect(consoleSpy).toHaveBeenCalledWith(
          `📦 Local version: ${currentVersion}`
        );
        expect(consoleSpy).toHaveBeenCalledWith('🌐 Remote version: 99.0.0');
      } finally {
        consoleSpy.mockRestore();

        if (originalNodeEnv) {
          process.env.NODE_ENV = originalNodeEnv;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        }
      }
    });

    it('should skip check in CI environment with verbose output', async () => {
      process.env.CI = 'true';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await checkAndUpgrade({ verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔍 Skipping version check in CI/test environment'
      );

      consoleSpy.mockRestore();
    });

    it('should skip network fetch when within check interval (cache hit)', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      const originalXDG = process.env.XDG_CACHE_HOME;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const tempCacheBase = join(
        tmpdir(),
        `commit-msg-test-cache-${Date.now()}`
      );
      mkdirSync(tempCacheBase, { recursive: true });
      writeFileSync(
        join(tempCacheBase, 'commit-msg-update-cache.json'),
        JSON.stringify({ lastUpdateCheck: Date.now() })
      );
      process.env.XDG_CACHE_HOME = tempCacheBase;

      const mockLatestVersion = await import('latest-version');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await checkAndUpgrade({
          verbose: true,
          autoUpgrade: false,
          checkInterval: 1000 * 60 * 60 * 8,
        });

        expect(mockLatestVersion.default).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          '✅ Skipping check (within interval)'
        );
      } finally {
        consoleSpy.mockRestore();
        if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv;
        if (originalCI) process.env.CI = originalCI;
        if (originalXDG !== undefined) {
          process.env.XDG_CACHE_HOME = originalXDG;
        } else {
          delete process.env.XDG_CACHE_HOME;
        }
      }
    });

    it('should invoke upgrade flow when autoUpgrade is true and update available', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockResolvedValue('99.0.0');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await checkAndUpgrade({
          autoUpgrade: true,
          silent: false,
          checkInterval: 0,
        });

        expect(mockLatestVersion.default).toHaveBeenCalled();
        const logs = consoleSpy.mock.calls.map((c) => c[0]).join(' ');
        expect(logs).toContain('New version available');
        expect(logs).toContain('Starting automatic upgrade');
      } finally {
        consoleSpy.mockRestore();

        if (originalNodeEnv) {
          process.env.NODE_ENV = originalNodeEnv;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        }
      }
    });

    it('should show update command without running upgrade when autoUpgrade is false', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockResolvedValue('99.0.0');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await checkAndUpgrade({
          autoUpgrade: false,
          silent: false,
          checkInterval: 0,
        });

        const logs = consoleSpy.mock.calls.map((c) => c[0]).join(' ');
        expect(logs).toContain('New version available');
        expect(logs).toContain('Run the following command to update:');
        expect(logs).toContain('@ai-coding-workshop/commit-msg');
        expect(logs).not.toContain('Starting automatic upgrade');
      } finally {
        consoleSpy.mockRestore();

        if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv;
        if (originalCI) process.env.CI = originalCI;
      }
    });

    it('should write cache after fetching latest version', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      const originalXDG = process.env.XDG_CACHE_HOME;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const tempCacheBase = join(
        tmpdir(),
        `commit-msg-cache-write-test-${Date.now()}`
      );
      mkdirSync(tempCacheBase, { recursive: true });
      process.env.XDG_CACHE_HOME = tempCacheBase;

      const cachePath = join(tempCacheBase, 'commit-msg-update-cache.json');
      expect(() => readFileSync(cachePath)).toThrow();

      try {
        await checkAndUpgrade({
          verbose: false,
          autoUpgrade: false,
          checkInterval: 0,
        });

        const cache = JSON.parse(readFileSync(cachePath, 'utf8'));
        expect(cache).toHaveProperty('lastUpdateCheck');
        expect(typeof cache.lastUpdateCheck).toBe('number');
        expect(cache.lastUpdateCheck).toBeLessThanOrEqual(Date.now());
        expect(cache.lastUpdateCheck).toBeGreaterThan(Date.now() - 5000);
      } finally {
        if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv;
        if (originalCI) process.env.CI = originalCI;
        if (originalXDG !== undefined) {
          process.env.XDG_CACHE_HOME = originalXDG;
        } else {
          delete process.env.XDG_CACHE_HOME;
        }
      }
    });

    it('should spawn correct npm update command when performing upgrade', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const mockLatestVersion = await import('latest-version');
      vi.mocked(mockLatestVersion.default).mockResolvedValue('99.0.0');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await checkAndUpgrade({
          autoUpgrade: true,
          silent: false,
          verbose: true,
          checkInterval: 0,
        });

        const logs = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
        expect(logs).toMatch(/Update command:.*npm (update|install)/);
        expect(logs).toContain('@ai-coding-workshop/commit-msg');
        expect(logs).toMatch(/Executing: npm .*--yes.*--force/);
      } finally {
        consoleSpy.mockRestore();

        if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv;
        if (originalCI) process.env.CI = originalCI;
      }
    });
  });

  describe('CLI Integration', () => {
    it('should show check-update command in help', () => {
      const output = execSync('node dist/bin/commit-msg.js --help', {
        encoding: 'utf-8',
      });

      expect(output).toContain('check-update');
      expect(output).toContain('Check for available updates');
    });

    it('should execute check-update command successfully', () => {
      const output = execSync('node dist/bin/commit-msg.js check-update', {
        encoding: 'utf-8',
      });

      expect(output).toContain('✅ You are using the latest version');
    });

    it('should execute check-update command with verbose flag', () => {
      const output = execSync(
        'node dist/bin/commit-msg.js check-update --verbose',
        {
          encoding: 'utf-8',
        }
      );

      expect(output).toContain('🔍 Checking for updates...');
      expect(output).toContain(`📦 Current local version: ${currentVersion}`);
      expect(output).toContain('✅ You are using the latest version');
      expect(output).toContain(`📦 Local version: ${currentVersion}`);
    });

    it('should execute check-update command with environment variable', () => {
      const output = execSync('node dist/bin/commit-msg.js check-update', {
        encoding: 'utf-8',
        env: { ...process.env, COMMIT_MSG_VERBOSE: 'true' },
      });

      expect(output).toContain('🔍 Checking for updates...');
      expect(output).toContain(`📦 Current local version: ${currentVersion}`);
      expect(output).toContain('✅ You are using the latest version');
      expect(output).toContain(`📦 Local version: ${currentVersion}`);
    });

    it('should use UPDATE_CHECK_INTERVAL environment variable for check interval', () => {
      const output = execSync(
        'node dist/bin/commit-msg.js check-update --verbose',
        {
          encoding: 'utf-8',
          env: { ...process.env, UPDATE_CHECK_INTERVAL: '3600' }, // 1 hour in seconds
        }
      );

      expect(output).toContain('🔍 Checking for updates...');
      expect(output).toContain(`📦 Current local version: ${currentVersion}`);
      expect(output).toContain('⏰ Check interval: 1 hours');
      expect(output).toContain('✅ You are using the latest version');
    });

    it('should use UPDATE_CHECK_INTERVAL environment variable for checkAndUpgrade', async () => {
      // Temporarily unset NODE_ENV and CI to avoid skipping in test environment
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      process.env.UPDATE_CHECK_INTERVAL = '1800'; // 30 minutes in seconds

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await checkAndUpgrade({ verbose: true, autoUpgrade: false });

        expect(consoleSpy).toHaveBeenCalledWith('🔍 Checking for updates...');
        expect(consoleSpy).toHaveBeenCalledWith(
          `📦 Current local version: ${currentVersion}`
        );
        expect(consoleSpy).toHaveBeenCalledWith('⏰ Check interval: 0.5 hours');
      } finally {
        consoleSpy.mockRestore();

        // Restore original environment variables
        if (originalNodeEnv) {
          process.env.NODE_ENV = originalNodeEnv;
        }
        if (originalCI) {
          process.env.CI = originalCI;
        }
        delete process.env.UPDATE_CHECK_INTERVAL;
      }
    });

    it('should invoke version check after install command (auto-upgrade flow)', () => {
      const tempDir = join(
        tmpdir(),
        `commit-msg-auto-upgrade-test-${Date.now()}`
      );
      mkdirSync(tempDir, { recursive: true });

      try {
        execSync('git -c init.defaultBranch=master init', {
          cwd: tempDir,
          stdio: 'ignore',
        });
        execSync('git config user.name "Test"', {
          cwd: tempDir,
          stdio: 'ignore',
        });
        execSync('git config user.email "test@test.com"', {
          cwd: tempDir,
          stdio: 'ignore',
        });

        const output = execSync(
          'node dist/bin/commit-msg.js install --verbose',
          {
            cwd: join(__dirname, '..'),
            encoding: 'utf-8',
            env: {
              ...process.env,
              NODE_ENV: 'production',
              CI: '',
              XDG_CACHE_HOME: join(tempDir, 'cache'),
              UPDATE_CHECK_INTERVAL: '0',
            },
          }
        );

        expect(output).toContain('Commit-msg hook installed successfully!');
        expect(
          output.includes('You are using the latest version') ||
            output.includes('New version available') ||
            output.includes('Skipping check')
        ).toBe(true);
      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });

    it('should invoke version check after exec command (auto-upgrade flow)', () => {
      const tempDir = join(
        tmpdir(),
        `commit-msg-exec-upgrade-test-${Date.now()}`
      );
      mkdirSync(tempDir, { recursive: true });

      try {
        execSync('git -c init.defaultBranch=master init', {
          cwd: tempDir,
          stdio: 'ignore',
        });
        execSync('git config user.name "Test"', {
          cwd: tempDir,
          stdio: 'ignore',
        });
        execSync('git config user.email "test@test.com"', {
          cwd: tempDir,
          stdio: 'ignore',
        });
        execSync('node dist/bin/commit-msg.js install', {
          cwd: join(__dirname, '..'),
          env: { ...process.env, NODE_ENV: 'test' },
          stdio: 'ignore',
        });

        const msgFile = join(tempDir, 'msg.txt');
        writeFileSync(msgFile, 'feat: test\n\nChange-Id: I123\n', 'utf8');

        const output = execSync(
          'node dist/bin/commit-msg.js exec --verbose ' + msgFile,
          {
            cwd: join(__dirname, '..'),
            encoding: 'utf-8',
            env: {
              ...process.env,
              NODE_ENV: 'production',
              CI: '',
              XDG_CACHE_HOME: join(tempDir, 'cache'),
              UPDATE_CHECK_INTERVAL: '0',
            },
          }
        );

        expect(output).toContain('Commit message processed');
        expect(
          output.includes('You are using the latest version') ||
            output.includes('New version available') ||
            output.includes('Skipping check')
        ).toBe(true);
      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });
  });
});
