import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('commit-msg merge commit handling tests with real git commits', () => {
  const tempDir = path.join(os.tmpdir(), 'commit-msg-merge-real-test');
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
    execSync('git -c init.defaultBranch=main init', { stdio: 'ignore' });
    execSync('git config user.name "Test User"', { stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { stdio: 'ignore' });

    // Set additional git configurations that might be needed (using repository-level settings only)
    execSync('git config commit.gpgsign false', { stdio: 'ignore' });
    execSync('git config init.defaultBranch main', { stdio: 'ignore' });

    // Additional configurations for CI environments
    execSync('git config commit.verbose false', { stdio: 'ignore' });
    execSync('git config pull.rebase false', { stdio: 'ignore' });
    execSync('git config merge.tool ""', { stdio: 'ignore' });
    execSync('git config push.default simple', { stdio: 'ignore' });
    execSync('git config core.autocrlf false', { stdio: 'ignore' });

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

    if (installResult.status !== 0) {
      throw new Error(
        `Failed to install commit-msg hook: ${installResult.stderr}`
      );
    }
  });

  afterAll(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should process first commit in empty repository with Change-Id and Co-developed-by', () => {
    // Set environment variable to trigger CoDevelopedBy
    const env = { ...process.env, CLAUDECODE: '1' };

    // Create first commit
    execSync('echo "Initial content" > file1.txt', { stdio: 'ignore' });
    execSync('git add file1.txt', { stdio: 'ignore' });

    // Commit with the hook enabled
    const commitResult = spawnSync(
      'git',
      [
        'commit',
        '-m',
        'feat: initial commit\n\nThis is the first commit in the repository.',
      ],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(commitResult.status).toBe(0);

    // Get the commit message
    const showResult = spawnSync('git', ['show', '--format=%B', '-s', 'HEAD'], {
      cwd: testRepoDir,
      encoding: 'utf-8',
      timeout: 30000,
    });

    const commitMessage = showResult.stdout;

    // Verify that Change-Id was added
    expect(commitMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);

    // Verify that Co-developed-by was added
    expect(commitMessage).toContain(
      'Co-developed-by: Claude <noreply@anthropic.com>'
    );

    // Verify original content is preserved
    expect(commitMessage).toContain('feat: initial commit');
    expect(commitMessage).toContain(
      'This is the first commit in the repository.'
    );
  });

  it('should not modify merge commit message', () => {
    // Create a second branch
    execSync('git checkout -b feature-branch', { stdio: 'ignore' });
    execSync('echo "Feature content" > file2.txt', { stdio: 'ignore' });
    execSync('git add file2.txt', { stdio: 'ignore' });

    // Set environment variable to trigger CoDevelopedBy
    const env = { ...process.env, CLAUDECODE: '1' };

    // Commit on feature branch
    const featureCommitResult = spawnSync(
      'git',
      ['commit', '-m', 'feat: add feature\n\nThis is a feature commit.'],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(featureCommitResult.status).toBe(0);

    // Switch back to main branch
    execSync('git checkout main', { stdio: 'ignore' });
    execSync('echo "Main content" > file3.txt', { stdio: 'ignore' });
    execSync('git add file3.txt', { stdio: 'ignore' });

    // Commit on main branch
    const mainCommitResult = spawnSync(
      'git',
      [
        'commit',
        '-m',
        'feat: add main content\n\nThis is a main branch commit.',
      ],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(mainCommitResult.status).toBe(0);

    // Merge feature branch into main (this will create a merge commit)
    const mergeResult = spawnSync(
      'git',
      ['merge', '--no-ff', 'feature-branch'],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(mergeResult.status).toBe(0);

    // Get the merge commit message
    const showResult = spawnSync('git', ['show', '--format=%B', '-s', 'HEAD'], {
      cwd: testRepoDir,
      encoding: 'utf-8',
      timeout: 30000,
    });

    const commitMessage = showResult.stdout;

    // Verify that this is a merge commit
    expect(commitMessage).toContain('Merge branch ');

    // Should NOT contain Change-Id or Co-developed-by for merge commits
    expect(commitMessage).not.toMatch(/Change-Id: I[a-f0-9]{8,}/);
    expect(commitMessage).not.toContain('Co-developed-by:');
  });

  it('should process regular commit after merge commit with Change-Id and Co-developed-by', () => {
    // Set environment variable to trigger CoDevelopedBy
    const env = { ...process.env, CLAUDECODE: '1' };

    // Create a commit after the merge
    execSync('echo "Post-merge content" > file4.txt', { stdio: 'ignore' });
    execSync('git add file4.txt', { stdio: 'ignore' });

    const commitResult = spawnSync(
      'git',
      [
        'commit',
        '-m',
        'fix: resolve issue after merge\n\nThis is a regular commit that comes after a merge commit.',
      ],
      {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: env,
      }
    );

    expect(commitResult.status).toBe(0);

    // Get the commit message
    const showResult = spawnSync('git', ['show', '--format=%B', '-s', 'HEAD'], {
      cwd: testRepoDir,
      encoding: 'utf-8',
      timeout: 30000,
    });

    const commitMessage = showResult.stdout;

    // Verify that Change-Id was added
    expect(commitMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);

    // Verify that Co-developed-by was added
    expect(commitMessage).toContain(
      'Co-developed-by: Claude <noreply@anthropic.com>'
    );

    // Verify original content is preserved
    expect(commitMessage).toContain('fix: resolve issue after merge');
    expect(commitMessage).toContain(
      'This is a regular commit that comes after a merge commit.'
    );

    // Should NOT contain merge-related text
    expect(commitMessage).not.toContain('Merge branch');
  });
});
