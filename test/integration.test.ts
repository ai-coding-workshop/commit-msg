import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('commit-msg CLI integration tests', () => {
  const tempDir = path.join(os.tmpdir(), 'commit-msg-integration-test');
  const testRepoDir = path.join(tempDir, 'test-repo');
  let originalCwd: string;

  beforeAll(() => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create temporary directory for testing
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });

    // Initialize a test Git repository
    mkdirSync(testRepoDir, { recursive: true });
    process.chdir(testRepoDir);

    // Initialize git repo
    execSync('git -c init.defaultBranch=master init', { stdio: 'ignore' });
    execSync('git config user.name "Test User"', { stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
  });

  afterAll(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should install commit-msg hook and process commit message with Change-Id and Co-developed-by', () => {
    // Install the commit-msg hook
    const installResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'install'],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
      }
    );

    expect(installResult.status).toBe(0);
    expect(installResult.stdout).toContain(
      'Commit-msg hook installed successfully!'
    );

    // Check that the hook file exists
    const hookPath = path.join(testRepoDir, '.git', 'hooks', 'commit-msg');
    expect(existsSync(hookPath)).toBe(true);

    // Create a commit message file
    const messageFile = path.join(tempDir, 'commit-message.txt');
    const commitMessage = `feat: add new feature

This is a new feature that adds functionality to the application.
    
It includes several improvements and bug fixes.`;
    writeFileSync(messageFile, commitMessage, 'utf8');

    // Set environment variable to trigger CoDevelopedBy
    const env = { ...process.env, CLAUDECODE: '1' };

    // Execute the commit-msg hook directly
    const execResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'exec', messageFile],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(execResult.status).toBe(0);

    // Read the processed commit message
    const processedMessage = readFileSync(messageFile, 'utf8');

    // Verify that Change-Id was added
    expect(processedMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);

    // Verify that Co-developed-by was added
    expect(processedMessage).toContain(
      'Co-developed-by: Claude <noreply@anthropic.com>'
    );

    // Verify original content is preserved
    expect(processedMessage).toContain('feat: add new feature');
    expect(processedMessage).toContain(
      'This is a new feature that adds functionality to the application.'
    );
  });

  it('should handle merge commits correctly by skipping processing', () => {
    // Create a commit message file that simulates a merge commit
    const messageFile = path.join(tempDir, 'merge-commit-message.txt');
    const mergeCommitMessage = `Merge branch 'main' of github.com:user/repo

This is a merge commit message.`;
    writeFileSync(messageFile, mergeCommitMessage, 'utf8');

    // Set environment variable to trigger CoDevelopedBy
    const env = { ...process.env, CLAUDECODE: '1' };

    // Execute the commit-msg hook directly
    const execResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'exec', messageFile],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    // For merge commits, the hook should exit with status 0 but not process the message
    expect(execResult.status).toBe(0);
  });

  it('should handle temporary commits (fixup!/squash!) correctly by skipping processing', () => {
    // Create a fixup commit message
    const messageFile = path.join(tempDir, 'fixup-commit-message.txt');
    const fixupCommitMessage = `fixup! feat: add new feature

This is a fixup commit.`;
    writeFileSync(messageFile, fixupCommitMessage, 'utf8');

    // Set environment variable to trigger CoDevelopedBy
    const env = { ...process.env, CLAUDECODE: '1' };

    // Execute the commit-msg hook directly
    const execResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'exec', messageFile],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(execResult.status).toBe(0);

    // Read the processed commit message - it should be unchanged
    const processedMessage = readFileSync(messageFile, 'utf8');
    expect(processedMessage).toBe(fixupCommitMessage);
  });

  it('should work with existing Change-Id by not adding another one', () => {
    // Create a commit message with existing Change-Id
    const messageFile = path.join(tempDir, 'existing-changeid-message.txt');
    const existingChangeId = 'I123456789abcdef0123456789abcdef01234567';
    const commitMessage = `feat: update feature

This updates an existing feature.

Change-Id: ${existingChangeId}`;
    writeFileSync(messageFile, commitMessage, 'utf8');

    // Set environment variable to trigger CoDevelopedBy
    const env = { ...process.env, CLAUDECODE: '1' };

    // Execute the commit-msg hook directly
    const execResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'exec', messageFile],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(execResult.status).toBe(0);

    // Read the processed commit message
    const processedMessage = readFileSync(messageFile, 'utf8');

    // Should still have the original Change-Id
    expect(processedMessage).toContain(`Change-Id: ${existingChangeId}`);

    // Should have added Co-developed-by
    expect(processedMessage).toContain(
      'Co-developed-by: Claude <noreply@anthropic.com>'
    );

    // Should only have one Change-Id
    const changeIdMatches = processedMessage.match(/Change-Id:/g);
    expect(changeIdMatches).toHaveLength(1);
  });

  it('should work with different CoDevelopedBy environments', () => {
    // Create a commit message file
    const messageFile = path.join(tempDir, 'co-developed-message.txt');
    const commitMessage = `feat: add awesome feature

This is a really awesome feature.`;
    writeFileSync(messageFile, commitMessage, 'utf8');

    // Test with GEMINI_CLI environment variable, but first unset CLAUDECODE
    const env = { ...process.env, CLAUDECODE: undefined, GEMINI_CLI: '1' };

    // Execute the commit-msg hook directly
    const execResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'exec', messageFile],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(execResult.status).toBe(0);

    // Read the processed commit message
    const processedMessage = readFileSync(messageFile, 'utf8');

    // Should have added Co-developed-by for Gemini
    expect(processedMessage).toContain(
      'Co-developed-by: Gemini <noreply@developers.google.com>'
    );
  });

  it('should work with QWEN_CODE environment variable', () => {
    // Create a commit message file
    const messageFile = path.join(tempDir, 'qwen-code-message.txt');
    const commitMessage = `feat: implement AI feature

This feature uses AI technology to enhance the application.`;
    writeFileSync(messageFile, commitMessage, 'utf8');

    // Test with QWEN_CODE environment variable, but first unset higher priority variables
    const env = {
      ...process.env,
      CLAUDECODE: undefined,
      QWEN_CODE: '1',
      GEMINI_CLI: undefined,
      VSCODE_BRAND: undefined,
      CURSOR_TRACE_ID: undefined,
    };

    // Execute the commit-msg hook directly
    const execResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'exec', messageFile],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(execResult.status).toBe(0);

    // Read the processed commit message
    const processedMessage = readFileSync(messageFile, 'utf8');

    // Should have added Change-Id
    expect(processedMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);

    // Should have added Co-developed-by for Qwen-Coder
    expect(processedMessage).toContain(
      'Co-developed-by: Qwen-Coder <noreply@alibabacloud.com>'
    );

    // Verify original content is preserved
    expect(processedMessage).toContain('feat: implement AI feature');
    expect(processedMessage).toContain(
      'This feature uses AI technology to enhance the application.'
    );
  });

  it('should work with disabled CoDevelopedBy configuration', () => {
    // Create a commit message file
    const messageFile = path.join(tempDir, 'no-co-developed-message.txt');
    const commitMessage = `fix: resolve issue

This resolves a critical issue.`;
    writeFileSync(messageFile, commitMessage, 'utf8');

    // Set up git configuration to disable CoDevelopedBy
    execSync('git config commit-msg.coDevelopedBy false', { stdio: 'ignore' });

    // Set environment variable to trigger CoDevelopedBy (should be ignored due to config)
    const env = { ...process.env, CLAUDECODE: '1' };

    // Execute the commit-msg hook directly
    const execResult = spawnSync(
      'node',
      [path.join(originalCwd, 'dist/bin/commit-msg.js'), 'exec', messageFile],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(execResult.status).toBe(0);

    // Read the processed commit message
    const processedMessage = readFileSync(messageFile, 'utf8');

    // Should have added Change-Id
    expect(processedMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);

    // Should NOT have added Co-developed-by due to config
    expect(processedMessage).not.toContain('Co-developed-by:');
  });
});
