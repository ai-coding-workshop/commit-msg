import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import {
  checkAndUpgrade,
  checkForUpdatesOnly,
} from '../src/utils/version-checker';

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
  });
});
