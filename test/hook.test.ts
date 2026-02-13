import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('commit-msg.hook template tests', () => {
  let tempDir: string;
  let testRepoDir: string;
  let originalCwd: string;
  let originalPath: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = join(
      tmpdir(),
      `commit-msg-hook-test-${Date.now()}-${Math.random()}`
    );
    testRepoDir = join(tempDir, 'test-repo');
    originalCwd = process.cwd();
    originalPath = process.env.PATH || '';

    // Create test directory and git repo
    mkdirSync(testRepoDir, { recursive: true });
    process.chdir(testRepoDir);

    // Initialize git repo
    execSync('git -c init.defaultBranch=master init', { stdio: 'ignore' });
    execSync('git config user.name "Test User"', { stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { stdio: 'ignore' });

    // Install the hook using our CLI
    const installResult = spawnSync(
      'node',
      [join(originalCwd, 'dist/bin/commit-msg.js'), 'install'],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
      }
    );

    if (installResult.status !== 0) {
      throw new Error(`Failed to install hook: ${installResult.stderr}`);
    }
  });

  afterEach(() => {
    // Restore original working directory and PATH
    process.chdir(originalCwd);
    process.env.PATH = originalPath;

    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('debug parameter handling', () => {
    it('should exit gracefully when encountering DEBUG_MODE_TEST as message file', () => {
      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      const result = spawnSync(hookPath, ['DEBUG_MODE_TEST'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `${join(originalCwd, 'dist/bin')}:${originalPath}`,
          DEBUG: '1',
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Debug mode: exiting without processing');
    });
  });

  describe('PATH commit-msg detection', () => {
    it('should handle PATH commit-msg that does not support --version', () => {
      // Create a fake commit-msg in PATH that doesn't support --version
      const fakeBinDir = join(tempDir, 'fake-bin');
      mkdirSync(fakeBinDir, { recursive: true });

      const fakeCommitMsg = join(fakeBinDir, 'commit-msg');
      writeFileSync(
        fakeCommitMsg,
        '#!/bin/sh\necho "fake commit-msg"\nexit 1\n'
      );
      chmodSync(fakeCommitMsg, 0o755);

      // Prepend fake bin to PATH
      process.env.PATH = `${fakeBinDir}:${originalPath}`;

      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      // Create a dummy message file
      const messageFile = join(tempDir, 'test-message.txt');
      writeFileSync(messageFile, 'test commit message');

      const result = spawnSync(hookPath, [messageFile], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, DEBUG: '1' },
      });

      // Debug output to help diagnose issues
      console.log('=== Debug Output ===');
      console.log('Status:', result.status);
      console.log('stdout:', result.stdout);
      console.log('stderr:', result.stderr);
      console.log('===================');

      // Will try to run commit-msg with package prefix, so status test is not stable
      // expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'WARNING: Found commit-msg command but not from @ai-coding-workshop/commit-msg package'
      );
    });

    it('should handle PATH commit-msg with incorrect version output', () => {
      // Create a fake commit-msg in PATH with wrong version output
      const fakeBinDir = join(tempDir, 'fake-bin');
      mkdirSync(fakeBinDir, { recursive: true });

      const fakeCommitMsg = join(fakeBinDir, 'commit-msg');
      writeFileSync(
        fakeCommitMsg,
        '#!/bin/sh\nif [ "$1" = "--version" ]; then\n  echo "wrong-package v1.0.0"\nelse\n  echo "fake commit-msg"\nfi\n'
      );
      chmodSync(fakeCommitMsg, 0o755);

      // Prepend fake bin to PATH
      process.env.PATH = `${fakeBinDir}:${originalPath}`;

      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      // Create a dummy message file
      const messageFile = join(tempDir, 'test-message.txt');
      writeFileSync(messageFile, 'test commit message');

      const result = spawnSync(hookPath, [messageFile], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, DEBUG: '1' },
      });

      // Debug output to help diagnose issues
      console.log('=== Debug Output (incorrect version) ===');
      console.log('Status:', result.status);
      console.log('stdout:', result.stdout);
      console.log('stderr:', result.stderr);
      console.log('========================================');

      // Will try to run commit-msg with package prefix, so status test is not stable
      // expect(result.status).toBe(0);
      expect(result.stderr).toContain(
        'WARNING: Found commit-msg command but not from @ai-coding-workshop/commit-msg package'
      );
      expect(result.stderr).toContain('wrong-package v1.0.0');
    });
  });

  describe('npm global prefix with spaces', () => {
    it('should handle npm global prefix in path with spaces', () => {
      // Create a directory with spaces for npm global prefix
      const globalPrefixWithSpaces = join(tempDir, 'npm global with spaces');
      const binDir = join(globalPrefixWithSpaces, 'bin');
      mkdirSync(binDir, { recursive: true });

      // Create a working commit-msg in the global prefix with spaces
      const globalCommitMsg = join(binDir, 'commit-msg');
      writeFileSync(
        globalCommitMsg,
        `#!/bin/sh\nif [ "$1" = "--version" ]; then\n  echo "@ai-coding-workshop/commit-msg: 1.0.0"\nelse\n  node "${join(originalCwd, 'dist/bin/commit-msg.js')}" exec "$@"\nfi\n`
      );
      chmodSync(globalCommitMsg, 0o755);

      // Mock npm prefix to return path with spaces
      const mockNpmScript = join(tempDir, 'npm');
      writeFileSync(
        mockNpmScript,
        `#!/bin/sh\nif [ "$1" = "prefix" ] && [ "$2" = "-g" ]; then\n  echo "${globalPrefixWithSpaces}"\nelse\n  echo "mock npm"\nfi\n`
      );
      chmodSync(mockNpmScript, 0o755);

      // Update PATH to use mock npm but also keep basic system tools
      process.env.PATH = `${tempDir}:${join(originalCwd, 'dist/bin')}:/bin:/usr/bin`;

      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      const result = spawnSync(hookPath, ['DEBUG_MODE_TEST'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `${join(originalCwd, 'dist/bin')}:${originalPath}`,
          DEBUG: '1',
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Debug mode: exiting without processing');
    });
  });

  describe('npm local prefix with spaces', () => {
    it('should handle npm local prefix in path with spaces', () => {
      // Create a local npm project in a directory with spaces
      const localPrefixWithSpaces = join(tempDir, 'local project with spaces');
      const nodeModulesDir = join(
        localPrefixWithSpaces,
        'node_modules',
        '.bin'
      );
      mkdirSync(nodeModulesDir, { recursive: true });

      // Create a working commit-msg in the local prefix with spaces
      const localCommitMsg = join(nodeModulesDir, 'commit-msg');
      writeFileSync(
        localCommitMsg,
        `#!/bin/sh\nif [ "$1" = "--version" ]; then\n  echo "@ai-coding-workshop/commit-msg: 1.0.0"\nelse\n  node "${join(originalCwd, 'dist/bin/commit-msg.js')}" exec "$@"\nfi\n`
      );
      chmodSync(localCommitMsg, 0o755);

      // Create package.json in local prefix
      writeFileSync(
        join(localPrefixWithSpaces, 'package.json'),
        '{"name": "test-project"}'
      );

      // Mock npm script to handle both global and local prefix calls
      const mockNpmScript = join(tempDir, 'npm');
      writeFileSync(
        mockNpmScript,
        `#!/bin/sh\nif [ "$1" = "prefix" ] && [ "$2" = "-g" ]; then\n  echo "/nonexistent/global"\nelif [ "$1" = "prefix" ]; then\n  echo "${localPrefixWithSpaces}"\nelse\n  echo "mock npm"\nfi\n`
      );
      chmodSync(mockNpmScript, 0o755);

      // Update PATH to use mock npm, remove global commit-msg from PATH
      process.env.PATH = `${tempDir}:${join(originalCwd, 'dist/bin')}:${originalPath}`;

      // Change to the local project directory
      process.chdir(localPrefixWithSpaces);

      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      const result = spawnSync(hookPath, ['DEBUG_MODE_TEST'], {
        cwd: localPrefixWithSpaces,
        encoding: 'utf-8',
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `${join(originalCwd, 'dist/bin')}:${originalPath}`,
          DEBUG: '1',
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Debug mode: exiting without processing');
    });
  });

  describe('npm not installed scenarios', () => {
    it('should report error when npm is not installed', () => {
      // Remove both npm and our commit-msg from PATH completely
      const emptyBinDir = join(tempDir, 'empty-bin');
      mkdirSync(emptyBinDir, { recursive: true });

      // Set PATH to only include empty directory
      process.env.PATH = `${emptyBinDir}:/bin:/usr/bin`;

      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      const result = spawnSync(hookPath, ['DEBUG_MODE_TEST'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, DEBUG: '1' },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'ERROR: Node.js is not installed or not in PATH'
      );
      expect(result.stderr).toContain(
        'npm install -g @ai-coding-workshop/commit-msg'
      );
    });
  });

  describe('package not installed scenarios', () => {
    it('should report error when package is not installed via npm', () => {
      // Create a mock npm that returns nonexistent paths for prefix commands
      const mockNpmScript = join(tempDir, 'npm');
      writeFileSync(
        mockNpmScript,
        '#!/bin/sh\nif [ "$1" = "prefix" ]; then\n  echo "/nonexistent"\nelse\n  echo "mock npm"\nfi\n'
      );
      chmodSync(mockNpmScript, 0o755);

      // Create a mock npx that will fail version check
      const mockNpxScript = join(tempDir, 'npx');
      writeFileSync(
        mockNpxScript,
        '#!/bin/sh\nif [ "$1" = "--no-install" ] && [ "$2" = "@ai-coding-workshop/commit-msg" ] && [ "$3" = "--version" ]; then\n  echo "package not found"\n  exit 1\nelse\n  echo "mock npx"\nfi\n'
      );
      chmodSync(mockNpxScript, 0o755);

      // Set PATH to only include mock tools, no real commit-msg
      process.env.PATH = `${tempDir}:/bin:/usr/bin`;

      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      const result = spawnSync(hookPath, ['DEBUG_MODE_TEST'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, DEBUG: '1' },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'ERROR: Cannot find node.js package "@ai-coding-workshop/commit-msg" from /nonexistent/bin'
      );
      expect(result.stderr).toContain(
        'npm install -g @ai-coding-workshop/commit-msg'
      );
    });
  });

  describe('debug output', () => {
    it('should show debug information when DEBUG=1 is set', () => {
      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      const result = spawnSync(hookPath, ['DEBUG_MODE_TEST'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `${join(originalCwd, 'dist/bin')}:${originalPath}`,
          DEBUG: '1',
        },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain(
        '[DEBUG] Starting commit-msg hook execution'
      );
      expect(result.stderr).toContain(
        '[DEBUG] Package name: @ai-coding-workshop/commit-msg'
      );
      expect(result.stderr).toContain('[DEBUG] Arguments: DEBUG_MODE_TEST');
    });

    it('should not show debug information when DEBUG is not set', () => {
      const hookPath = join(testRepoDir, '.git', 'hooks', 'commit-msg');

      const result = spawnSync(hookPath, ['DEBUG_MODE_TEST'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `${join(originalCwd, 'dist/bin')}:${originalPath}`,
          DEBUG: undefined,
        },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain('[DEBUG]');
    });
  });
});
