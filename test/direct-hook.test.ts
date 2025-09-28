import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import {
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  symlinkSync,
  readFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('direct commit-msg hook execution tests', () => {
  let tempDir: string;
  let testRepoDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = join(
      tmpdir(),
      `direct-commit-msg-hook-test-${Date.now()}-${Math.random()}`
    );
    testRepoDir = join(tempDir, 'test-repo');
    originalCwd = process.cwd();

    // Create test directory and git repo
    mkdirSync(testRepoDir, { recursive: true });
    process.chdir(testRepoDir);

    // Initialize git repo
    execSync('git -c init.defaultBranch=master init', { stdio: 'ignore' });
    execSync('git config user.name "Test User"', { stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('direct execution as commit-msg hook', () => {
    it('should process commit message file when executed directly with file argument', () => {
      // Create the commit message file
      const messageFile = join(tempDir, 'COMMIT_EDITMSG');
      writeFileSync(
        messageFile,
        'feat: Add new feature\n\nThis is a test commit message.\n'
      );

      // Execute commit-msg directly with the message file as argument
      const result = spawnSync(
        'node',
        [join(originalCwd, 'dist/bin/commit-msg.js'), messageFile],
        {
          cwd: testRepoDir,
          encoding: 'utf-8',
          timeout: 30000,
          env: {
            ...process.env,
            CLAUDECODE: '1',
          },
        }
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');

      // Verify the file was processed and contains Change-Id
      const processedContent = result.stdout;
      expect(processedContent).toContain('Executing commit-msg hook on file:');
      expect(processedContent).toContain(
        'Commit message processed and saved successfully!'
      );

      // Read the actual file content to verify it was modified
      const fileContent = readFileSync(messageFile, 'utf-8');
      expect(fileContent).toContain('Change-Id:');
      expect(fileContent).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );
    });

    it('should run install command when executed without arguments', () => {
      // Execute commit-msg directly without arguments
      const result = spawnSync(
        'node',
        [join(originalCwd, 'dist/bin/commit-msg.js')],
        {
          cwd: testRepoDir,
          encoding: 'utf-8',
          timeout: 30000,
        }
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Installing commit-msg hook...');
      expect(result.stdout).toContain(
        'Commit-msg hook installed successfully!'
      );
    });

    it('should show error when file does not exist', () => {
      // Execute commit-msg with non-existent file
      const result = spawnSync(
        'node',
        [join(originalCwd, 'dist/bin/commit-msg.js'), 'non-existent-file.txt'],
        {
          cwd: testRepoDir,
          encoding: 'utf-8',
          timeout: 30000,
        }
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'Error: Command or file not found: non-existent-file.txt'
      );
    });

    it('should work when symlinked as commit-msg hook', () => {
      // Create symlink to commit-msg in .git/hooks directory
      const hooksDir = join(testRepoDir, '.git', 'hooks');
      mkdirSync(hooksDir, { recursive: true });

      const commitMsgHook = join(hooksDir, 'commit-msg');
      symlinkSync(join(originalCwd, 'dist/bin/commit-msg.js'), commitMsgHook);

      // Create the commit message file
      const messageFile = join(tempDir, 'COMMIT_EDITMSG');
      writeFileSync(
        messageFile,
        'fix: Correct bug in user authentication\n\nThis fixes an issue where users could not log in.\n'
      );

      // Execute the symlinked hook directly with the message file as argument
      const result = spawnSync(commitMsgHook, [messageFile], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: {
          ...process.env,
          CLAUDECODE: '1',
        },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');

      // Read the file content to verify it was modified
      const fileContent = readFileSync(messageFile, 'utf-8');
      expect(fileContent).toContain('Change-Id:');
      expect(fileContent).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );
    });
  });

  describe('verbose mode in direct execution', () => {
    it('should show verbose output when --verbose flag is used', () => {
      // Create the commit message file
      const messageFile = join(tempDir, 'COMMIT_EDITMSG');
      writeFileSync(
        messageFile,
        'chore: Update dependencies\n\nUpdate package versions.\n'
      );

      // Execute commit-msg with verbose flag
      const result = spawnSync(
        'node',
        [join(originalCwd, 'dist/bin/commit-msg.js'), '--verbose', messageFile],
        {
          cwd: testRepoDir,
          encoding: 'utf-8',
          timeout: 30000,
          env: {
            ...process.env,
            CLAUDECODE: '1',
          },
        }
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Executing commit-msg hook on file:');
      expect(result.stdout).toContain(
        'Commit message processed and saved successfully!'
      );
      // Add more specific verbose output checks if needed
    });
  });
});
