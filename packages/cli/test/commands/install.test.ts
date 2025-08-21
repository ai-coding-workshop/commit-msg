import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import { installImpl } from '../../src/commands/install';

// Types for fs module mocks
type FsExistsSyncMock = (path: fs.PathLike) => boolean;
type FsReadFileSyncMock = (
  path: fs.PathLike,
  options: { encoding: string } | string
) => string;
type FsWriteFileSyncMock = (
  path: fs.PathLike,
  data: string | Buffer,
  options?: fs.WriteFileOptions
) => void;
type FsMkdirSyncMock = (
  path: fs.PathLike,
  options?: fs.MakeDirectoryOptions
) => void;

// Mock the file system and child_process modules
vi.mock('fs');
vi.mock('child_process');

describe('install command', () => {
  const mockGitDir = '.git';
  const mockHooksPath = '.husky/mock';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock console.log and console.error to avoid output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  it('should install commit-msg hook in default hooks directory', async () => {
    // Mock git commands
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--git-dir')
        ) {
          return {
            stdout: mockGitDir,
            status: 0,
            error: undefined,
          } as SpawnSyncReturns<Buffer>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            status: 1,
            error: new Error('core.hooksPath not set'),
          } as SpawnSyncReturns<Buffer>;
        }
        return {
          stdout: '',
          status: 0,
          error: undefined,
        } as SpawnSyncReturns<Buffer>;
      }
    );

    // Mock file system operations
    vi.mocked(fs.existsSync).mockImplementation(((filePath: fs.PathLike) => {
      if (filePath === mockGitDir) return true;
      if (filePath === path.join(mockGitDir, 'hooks')) return true;
      return false;
    }) as FsExistsSyncMock);

    vi.mocked(fs.readFileSync).mockImplementation(((
      _path: fs.PathLike,
      _options: { encoding: string } | string
    ) => {
      return '# commit-msg hook template';
    }) as FsReadFileSyncMock);

    vi.mocked(fs.writeFileSync).mockImplementation(((
      _path: fs.PathLike,
      _data: string | Buffer,
      _options?: fs.WriteFileOptions
    ) => {
      // Mock implementation
    }) as FsWriteFileSyncMock);

    // Run the install command
    await installImpl();

    // Verify the hook was written to the correct location
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(mockGitDir, 'hooks', 'commit-msg'),
      '# commit-msg hook template',
      { mode: 0o755 }
    );
  });

  it('should install commit-msg hook in custom hooks directory (relative path)', async () => {
    // Mock git commands
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--git-dir')
        ) {
          return {
            stdout: mockGitDir,
            status: 0,
            error: undefined,
          } as SpawnSyncReturns<Buffer>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: mockHooksPath,
            status: 0,
            error: undefined,
          } as SpawnSyncReturns<Buffer>;
        }
        return {
          stdout: '',
          status: 0,
          error: undefined,
        } as SpawnSyncReturns<Buffer>;
      }
    );

    // Mock file system operations
    vi.mocked(fs.existsSync).mockImplementation(((filePath: fs.PathLike) => {
      if (filePath === mockGitDir) return true;
      if (filePath === path.join(mockGitDir, mockHooksPath)) return true;
      return false;
    }) as FsExistsSyncMock);

    vi.mocked(fs.readFileSync).mockImplementation(((
      _path: fs.PathLike,
      _options: { encoding: string } | string
    ) => {
      return '# commit-msg hook template';
    }) as FsReadFileSyncMock);

    vi.mocked(fs.writeFileSync).mockImplementation(((
      _path: fs.PathLike,
      _data: string | Buffer,
      _options?: fs.WriteFileOptions
    ) => {
      // Mock implementation
    }) as FsWriteFileSyncMock);

    // Run the install command
    await installImpl();

    // Verify the hook was written to the correct location
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(mockGitDir, mockHooksPath, 'commit-msg'),
      '# commit-msg hook template',
      { mode: 0o755 }
    );
  });

  it('should install commit-msg hook in custom hooks directory (absolute path)', async () => {
    const absoluteHooksPath = '/absolute/path/to/hooks';

    // Mock git commands
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--git-dir')
        ) {
          return {
            stdout: mockGitDir,
            status: 0,
            error: undefined,
          } as SpawnSyncReturns<Buffer>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: absoluteHooksPath,
            status: 0,
            error: undefined,
          } as SpawnSyncReturns<Buffer>;
        }
        return {
          stdout: '',
          status: 0,
          error: undefined,
        } as SpawnSyncReturns<Buffer>;
      }
    );

    // Mock file system operations
    vi.mocked(fs.existsSync).mockImplementation(((filePath: fs.PathLike) => {
      if (filePath === mockGitDir) return true;
      if (filePath === absoluteHooksPath) return true;
      return false;
    }) as FsExistsSyncMock);

    vi.mocked(fs.readFileSync).mockImplementation(((
      _path: fs.PathLike,
      _options: { encoding: string } | string
    ) => {
      return '# commit-msg hook template';
    }) as FsReadFileSyncMock);

    vi.mocked(fs.writeFileSync).mockImplementation(((
      _path: fs.PathLike,
      _data: string | Buffer,
      _options?: fs.WriteFileOptions
    ) => {
      // Mock implementation
    }) as FsWriteFileSyncMock);

    // Run the install command
    await installImpl();

    // Verify the hook was written to the correct location
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(absoluteHooksPath, 'commit-msg'),
      '# commit-msg hook template',
      { mode: 0o755 }
    );
  });

  it('should create hooks directory if it does not exist', async () => {
    // Mock git commands
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--git-dir')
        ) {
          return {
            stdout: mockGitDir,
            status: 0,
            error: undefined,
          } as SpawnSyncReturns<Buffer>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            status: 1,
            error: new Error('core.hooksPath not set'),
          } as SpawnSyncReturns<Buffer>;
        }
        return {
          stdout: '',
          status: 0,
          error: undefined,
        } as SpawnSyncReturns<Buffer>;
      }
    );

    // Mock file system operations
    vi.mocked(fs.existsSync).mockImplementation(((filePath: fs.PathLike) => {
      if (filePath === mockGitDir) return true;
      // Return false for hooks directory to trigger mkdirSync
      if (filePath === path.join(mockGitDir, 'hooks')) return false;
      return false;
    }) as FsExistsSyncMock);

    vi.mocked(fs.readFileSync).mockImplementation(((
      _path: fs.PathLike,
      _options: { encoding: string } | string
    ) => {
      return '# commit-msg hook template';
    }) as FsReadFileSyncMock);

    vi.mocked(fs.writeFileSync).mockImplementation(((
      _path: fs.PathLike,
      _data: string | Buffer,
      _options?: fs.WriteFileOptions
    ) => {
      // Mock implementation
    }) as FsWriteFileSyncMock);

    vi.mocked(fs.mkdirSync).mockImplementation(((
      _path: fs.PathLike,
      _options?: fs.MakeDirectoryOptions
    ) => {
      // Mock implementation
    }) as FsMkdirSyncMock);

    // Run the install command
    await installImpl();

    // Verify the hooks directory was created
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(mockGitDir, 'hooks'), {
      recursive: true,
    });

    // Verify the hook was written to the correct location
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(mockGitDir, 'hooks', 'commit-msg'),
      '# commit-msg hook template',
      { mode: 0o755 }
    );
  });

  it('should exit with error when not in a Git repository', async () => {
    // Mock git commands to return an error
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--git-dir')
        ) {
          return {
            stdout: '',
            status: 1,
            error: new Error('Not a Git repository'),
          } as SpawnSyncReturns<Buffer>;
        }
        return {
          stdout: '',
          status: 0,
          error: undefined,
        } as SpawnSyncReturns<Buffer>;
      }
    );

    // Run the install command and expect it to throw an error
    await expect(installImpl()).rejects.toThrow('Not in a Git repository');
  });

  it('should exit with error when template file cannot be read', async () => {
    // Mock process.exit
    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`process.exit unexpectedly called with "${code}"`);
      });

    // Mock git commands
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--git-dir')
        ) {
          return {
            stdout: mockGitDir,
            status: 0,
            error: undefined,
          } as SpawnSyncReturns<Buffer>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            status: 1,
            error: new Error('core.hooksPath not set'),
          } as SpawnSyncReturns<Buffer>;
        }
        return {
          stdout: '',
          status: 0,
          error: undefined,
        } as SpawnSyncReturns<Buffer>;
      }
    );

    // Mock file system operations
    vi.mocked(fs.existsSync).mockImplementation(((filePath: fs.PathLike) => {
      if (filePath === mockGitDir) return true;
      if (filePath === path.join(mockGitDir, 'hooks')) return true;
      return false;
    }) as FsExistsSyncMock);

    // Mock readFileSync to throw an error
    vi.mocked(fs.readFileSync).mockImplementation(((
      _path: fs.PathLike,
      _options: { encoding: string } | string
    ) => {
      throw new Error('Template file not found');
    }) as FsReadFileSyncMock);

    // Run the install command and expect it to call process.exit
    await expect(installImpl()).rejects.toThrow(
      'process.exit unexpectedly called with "1"'
    );

    // Verify that process.exit was called with code 1
    expect(mockExit).toHaveBeenCalledWith(1);

    // Restore the mock
    mockExit.mockRestore();
  });
});
