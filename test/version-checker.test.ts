import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  checkAndUpgrade,
  checkForUpdatesOnly,
} from '../src/utils/version-checker';

// Get current version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);
const currentVersion = packageJson.version;

interface MockNotifier {
  update?: {
    current: string;
    latest: string;
  };
}

// Mock update-notifier
vi.mock('update-notifier', () => ({
  default: vi.fn(() => ({
    update: null,
  })),
}));

describe('Version Checker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
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
      const mockUpdateNotifier = await import('update-notifier');
      const mockNotifier = {
        update: {
          current: '0.1.0',
          latest: '0.2.0',
        },
      };

      vi.mocked(mockUpdateNotifier.default).mockReturnValue(
        mockNotifier as MockNotifier
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const hasUpdate = await checkForUpdatesOnly();

      expect(hasUpdate).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('\n🔄 New version available!');
      expect(consoleSpy).toHaveBeenCalledWith('Current version: 0.1.0');
      expect(consoleSpy).toHaveBeenCalledWith('Latest version: 0.2.0');

      consoleSpy.mockRestore();
    });

    it('should return true and display verbose update info when update is available', async () => {
      const mockUpdateNotifier = await import('update-notifier');
      const mockNotifier = {
        update: {
          current: '0.1.0',
          latest: '0.2.0',
        },
      };

      vi.mocked(mockUpdateNotifier.default).mockReturnValue(
        mockNotifier as MockNotifier
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const hasUpdate = await checkForUpdatesOnly(true);

      expect(hasUpdate).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Checking for updates...');
      expect(consoleSpy).toHaveBeenCalledWith(
        `📦 Current local version: ${currentVersion}`
      );
      expect(consoleSpy).toHaveBeenCalledWith('✅ Update found!');
      expect(consoleSpy).toHaveBeenCalledWith('📦 Local version: 0.1.0');
      expect(consoleSpy).toHaveBeenCalledWith('🌐 Remote version: 0.2.0');
      expect(consoleSpy).toHaveBeenCalledWith('\n🔄 New version available!');
      expect(consoleSpy).toHaveBeenCalledWith('Current version: 0.1.0');
      expect(consoleSpy).toHaveBeenCalledWith('Latest version: 0.2.0');

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const mockUpdateNotifier = await import('update-notifier');
      vi.mocked(mockUpdateNotifier.default).mockImplementation(() => {
        throw new Error('Network error');
      });

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
      const mockUpdateNotifier = await import('update-notifier');
      vi.mocked(mockUpdateNotifier.default).mockImplementation(() => {
        throw new Error('Network error');
      });

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

      const mockUpdateNotifier = await import('update-notifier');
      const mockNotifier = vi.fn();
      vi.mocked(mockUpdateNotifier.default).mockReturnValue(
        mockNotifier as MockNotifier
      );

      await checkAndUpgrade();

      expect(mockNotifier).not.toHaveBeenCalled();
    });

    it('should skip check in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const mockUpdateNotifier = await import('update-notifier');
      const mockNotifier = vi.fn();
      vi.mocked(mockUpdateNotifier.default).mockReturnValue(
        mockNotifier as MockNotifier
      );

      await checkAndUpgrade();

      expect(mockNotifier).not.toHaveBeenCalled();
    });

    it('should handle errors silently', async () => {
      const mockUpdateNotifier = await import('update-notifier');
      vi.mocked(mockUpdateNotifier.default).mockImplementation(() => {
        throw new Error('Network error');
      });

      // In silent mode, errors are handled silently without console output
      await expect(checkAndUpgrade({ silent: true })).resolves.not.toThrow();
    });

    it('should show verbose output when verbose option is enabled', async () => {
      // Temporarily unset NODE_ENV and CI to avoid skipping in test environment
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCI = process.env.CI;
      delete process.env.NODE_ENV;
      delete process.env.CI;

      const mockUpdateNotifier = await import('update-notifier');
      const mockNotifier = {
        update: {
          current: '0.1.0',
          latest: '0.2.0',
        },
      };

      vi.mocked(mockUpdateNotifier.default).mockReturnValue(
        mockNotifier as MockNotifier
      );

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await checkAndUpgrade({ verbose: true, autoUpgrade: false });

        expect(consoleSpy).toHaveBeenCalledWith('🔍 Checking for updates...');
        expect(consoleSpy).toHaveBeenCalledWith(
          `📦 Current local version: ${currentVersion}`
        );
        expect(consoleSpy).toHaveBeenCalledWith('✅ Update found!');
        expect(consoleSpy).toHaveBeenCalledWith('📦 Local version: 0.1.0');
        expect(consoleSpy).toHaveBeenCalledWith('🌐 Remote version: 0.2.0');
      } finally {
        consoleSpy.mockRestore();

        // Restore original environment variables
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
  });
});
