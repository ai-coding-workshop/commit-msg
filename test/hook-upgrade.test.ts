import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('commit-msg hook upgrade tests', () => {
  const tempDir = path.join(os.tmpdir(), 'commit-msg-upgrade-test');
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

  it('should upgrade old hook version when executing commit-msg hook', () => {
    // First, install the commit-msg hook using the current version
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

    // Read the current hook content
    let hookContent = readFileSync(hookPath, 'utf8');

    // Extract version from hook file dynamically
    const versionMatch = hookContent.match(/COMMIT_MSG_HOOK_VERSION=(\d+)/);
    expect(versionMatch).toBeTruthy();
    const currentVersion = parseInt(versionMatch[1], 10);
    expect(currentVersion).toBeGreaterThanOrEqual(2);

    // Create an old version of the hook (version 1) by modifying the current hook content
    const currentHookContent = readFileSync(hookPath, 'utf8');
    const oldHookContent = currentHookContent.replace(
      /COMMIT_MSG_HOOK_VERSION=\d+/g,
      'COMMIT_MSG_HOOK_VERSION=1'
    );

    // Write the old hook content to simulate an outdated hook
    writeFileSync(hookPath, oldHookContent, { mode: 0o755 });

    // Verify the old hook was written correctly
    hookContent = readFileSync(hookPath, 'utf8');
    expect(hookContent).toContain('COMMIT_MSG_HOOK_VERSION=1');

    // Extract version from hook file dynamically
    const oldVersionMatch = hookContent.match(/COMMIT_MSG_HOOK_VERSION=(\d+)/);
    expect(oldVersionMatch).toBeTruthy();
    const hookVersion = parseInt(oldVersionMatch[1], 10);
    expect(hookVersion).toBe(1);
    expect(hookVersion).not.toBeGreaterThanOrEqual(2);

    // Create a commit message file
    const messageFile = path.join(tempDir, 'commit-message.txt');
    const commitMessage = `feat: add new feature

This is a new feature that adds functionality to the application.`;
    writeFileSync(messageFile, commitMessage, 'utf8');

    // Set environment variable to trigger CoDevelopedBy and ensure PATH includes dist/bin
    const env = {
      ...process.env,
      CLAUDECODE: '1',
      PATH: `${path.join(originalCwd, 'dist', 'bin')}:${process.env.PATH || ''}`,
    };

    // Execute the hook script directly (this should trigger the upgrade)
    const execResult = spawnSync('sh', [hookPath, messageFile], {
      cwd: testRepoDir,
      encoding: 'utf-8',
      timeout: 30000,
      env: env,
    });

    // Log the output for debugging
    console.log('stdout:', execResult.stdout);
    console.log('stderr:', execResult.stderr);
    console.log('status:', execResult.status);

    expect(execResult.status).toBe(0);

    // Read the hook content again to verify it was upgraded
    const upgradedHookContent = readFileSync(hookPath, 'utf8');

    // Should now contain the current version (dynamically extracted)
    const upgradedVersionMatch = upgradedHookContent.match(
      /COMMIT_MSG_HOOK_VERSION=(\d+)/
    );
    expect(upgradedVersionMatch).toBeTruthy();
    const upgradedVersion = parseInt(upgradedVersionMatch[1], 10);
    expect(upgradedVersion).toBeGreaterThanOrEqual(2);

    // Should contain the upgrade functionality - check for version 2 content
    expect(upgradedHookContent).toContain(
      '# Find commit-msg in PATH, which is quicker than using npm.'
    );

    // Should no longer contain the old version
    const finalVersionMatch = upgradedHookContent.match(
      /COMMIT_MSG_HOOK_VERSION=(\d+)/
    );
    expect(finalVersionMatch).toBeTruthy();
    const finalVersion = parseInt(finalVersionMatch[1], 10);
    expect(finalVersion).not.toBe(1);

    // Should have executed successfully
    expect(execResult.stdout).toContain(
      'Hook upgraded from version 1 to version 2'
    );
  });
});
