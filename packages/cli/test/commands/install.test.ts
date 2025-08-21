import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { install, getHooksDir } from '../../src/commands/install';

// Type definitions for child_process mocking
type SpawnSyncReturns<T> = {
  pid?: number;
  output: Array<T | null>;
  stdout: T;
  stderr: T;
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
};

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
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockGitDir, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            stderr: 'core.hooksPath not set',
            status: 1,
            error: new Error('core.hooksPath not set'),
            pid: 12345,
            output: [null, '', 'core.hooksPath not set'],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
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
    await install();

    // Verify the hook was written to the correct location
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(mockGitDir, 'hooks', 'commit-msg'),
      '# commit-msg hook template',
      { mode: 0o755 }
    );
  });

  it('should install commit-msg hook in custom hooks directory (relative path)', async () => {
    const mockWorkDirRoot = '/path/to/repo';

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
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockGitDir, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: mockHooksPath,
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockHooksPath, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--show-toplevel')
        ) {
          return {
            stdout: mockWorkDirRoot,
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockWorkDirRoot, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
      }
    );

    // Mock file system operations
    vi.mocked(fs.existsSync).mockImplementation(((filePath: fs.PathLike) => {
      if (filePath === mockGitDir) return true;
      if (filePath === path.join(mockWorkDirRoot, mockHooksPath)) return true;
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
    await install();

    // Verify the hook was written to the correct location
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(mockWorkDirRoot, mockHooksPath, 'commit-msg'),
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
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockGitDir, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
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
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
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
    await install();

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
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockGitDir, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            stderr: 'core.hooksPath not set',
            status: 1,
            error: new Error('core.hooksPath not set'),
            pid: 12345,
            output: [null, '', 'core.hooksPath not set'],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
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
    await install();

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
            stderr: 'Not a Git repository',
            status: 1,
            error: new Error('Not a Git repository'),
            pid: 12345,
            output: [null, '', 'Not a Git repository'],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
      }
    );

    // Mock process.exit to throw an error instead of exiting
    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`process.exit unexpectedly called with "${code}"`);
      });

    // Run the install command and expect it to throw an error
    await expect(install()).rejects.toThrow(
      'process.exit unexpectedly called with "1"'
    );

    // Restore the mock
    mockExit.mockRestore();
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
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockGitDir, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            stderr: 'core.hooksPath not set',
            status: 1,
            error: new Error('core.hooksPath not set'),
            pid: 12345,
            output: [null, '', 'core.hooksPath not set'],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
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
      throw new Error('Could not read hook template');
    }) as FsReadFileSyncMock);

    // Run the install command and expect it to throw an error
    await expect(install()).rejects.toThrow(
      'process.exit unexpectedly called with "1"'
    );

    // Restore the mock
    mockExit.mockRestore();
  });
});

describe('getHooksDir function', () => {
  const mockGitDir = '.git';
  const mockHooksPath = '.husky/mock';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  it('should return default hooks directory when core.hooksPath is not set', () => {
    // Mock git config command to return an error status
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            stderr: 'core.hooksPath not set',
            status: 1,
            error: new Error('core.hooksPath not set'),
            pid: 12345,
            output: [null, '', 'core.hooksPath not set'],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
      }
    );

    // Mock console.log to avoid output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const hooksDir = getHooksDir(mockGitDir);
    expect(hooksDir).toBe(path.join(mockGitDir, 'hooks'));
  });

  it('should return custom hooks directory when core.hooksPath is set (relative path)', () => {
    const mockWorkDirRoot = '/path/to/repo';

    // Mock git commands
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: mockHooksPath,
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockHooksPath, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        if (
          command === 'git' &&
          args.includes('rev-parse') &&
          args.includes('--show-toplevel')
        ) {
          return {
            stdout: mockWorkDirRoot,
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, mockWorkDirRoot, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
      }
    );

    const hooksDir = getHooksDir(mockGitDir);
    expect(hooksDir).toBe(path.join(mockWorkDirRoot, mockHooksPath));
  });

  it('should return custom hooks directory when core.hooksPath is set (absolute path)', () => {
    const absoluteHooksPath = '/absolute/path/to/hooks';

    // Mock git config command to return an absolute path
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: absoluteHooksPath,
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, absoluteHooksPath, ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
      }
    );

    const hooksDir = getHooksDir(mockGitDir);
    expect(hooksDir).toBe(absoluteHooksPath);
  });

  it('should return default hooks directory when core.hooksPath is empty', () => {
    // Mock git config command to return an empty string with success status
    vi.mocked(spawnSync).mockImplementation(
      (command: string, args: string[]) => {
        if (
          command === 'git' &&
          args.includes('config') &&
          args.includes('core.hooksPath')
        ) {
          return {
            stdout: '',
            stderr: '',
            status: 0,
            error: undefined,
            pid: 12345,
            output: [null, '', ''],
            signal: null,
          } as SpawnSyncReturns<string>;
        }
        return {
          stdout: '',
          stderr: '',
          status: 0,
          error: undefined,
          pid: 12345,
          output: [null, '', ''],
          signal: null,
        } as SpawnSyncReturns<string>;
      }
    );

    const hooksDir = getHooksDir(mockGitDir);
    expect(hooksDir).toBe(path.join(mockGitDir, 'hooks'));
  });
});
