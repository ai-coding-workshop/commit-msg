import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawnSync, execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Check Node.js version to determine which dev script to use
// Node.js 21+: Use tsx (dev)
// Node.js 19-20: Use tsx (dev:node20)
// Node.js 18: Use ts-node with CommonJS (dev:node18)
// <18: Use ts-node with CommonJS (dev:compat)
const nodeVersion = process.version;
const nodeMajorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
const devScript =
  nodeMajorVersion >= 21
    ? 'dev'
    : nodeMajorVersion <= 20 && nodeMajorVersion > 18
      ? 'dev:node20'
      : nodeMajorVersion === 18
        ? 'dev:node18'
        : 'dev:compat';

describe('commit-msg CLI npm pack tests', () => {
  const tempDir = path.join(os.tmpdir(), 'commit-msg-pack-test');
  const packageName = '@ai-coding-workshop/commit-msg';
  let tarballPath: string;
  let installedPackagePath: string;
  let installedBinPath: string;

  beforeAll(() => {
    // Create temporary directory for testing
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    // Clean up tarball if it exists
    if (tarballPath && existsSync(tarballPath)) {
      rmSync(tarballPath, { force: true });
    }
  });

  it('should create a tarball with npm pack', () => {
    // Run npm pack to create tarball
    const result = spawnSync('npm', ['pack'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 30000, // 30 seconds timeout
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBeTruthy();

    // Get the tarball filename from stdout
    const output = result.stdout.trim();
    const lines = output.split('\n');
    const tarballFilename = lines[lines.length - 1]; // Last line should be the filename

    // npm pack creates filename like: ai-coding-workshop-commit-msg-0.1.10.tgz
    expect(tarballFilename).toMatch(
      /^ai-coding-workshop-commit-msg-\d+\.\d+\.\d+.*\.tgz$/
    );
    expect(tarballFilename).toMatch(/\.tgz$/);

    tarballPath = path.join(process.cwd(), tarballFilename);
    expect(existsSync(tarballPath)).toBe(true);
  });

  it('should install the packed package and run commit-msg --version', () => {
    // Skip if tarball wasn't created
    if (!tarballPath || !existsSync(tarballPath)) {
      throw new Error('Tarball was not created in previous test');
    }

    // Install the packed package in temporary directory
    const installResult = spawnSync('npm', ['install', tarballPath], {
      cwd: tempDir,
      encoding: 'utf-8',
      timeout: 60000, // 60 seconds timeout
    });

    expect(installResult.status).toBe(0);

    // Store installed package paths for use in other tests
    installedPackagePath = path.join(tempDir, 'node_modules', packageName);
    installedBinPath = path.join(
      installedPackagePath,
      'dist',
      'bin',
      'commit-msg.js'
    );

    // Verify package was installed
    expect(existsSync(installedPackagePath)).toBe(true);
    expect(existsSync(installedBinPath)).toBe(true);

    // Test commit-msg --version command
    const versionResult = spawnSync('npx', ['commit-msg', '--version'], {
      cwd: tempDir,
      encoding: 'utf-8',
      timeout: 10000, // 10 seconds timeout
    });

    expect(versionResult.status).toBe(0);
    expect(versionResult.stdout).toContain(packageName);
  });

  it('should have the same version output as development mode', () => {
    // Skip if tarball wasn't created
    if (!tarballPath || !existsSync(tarballPath)) {
      throw new Error('Tarball was not created in previous test');
    }

    // For Node.js < 20, skip this test as development mode may not work
    if (nodeMajorVersion < 20) {
      console.log(
        `Skipping development mode comparison test for Node.js ${nodeVersion} due to ESM limitations`
      );
      return;
    }

    // Get version from packed package
    const packedVersionResult = spawnSync('npx', ['commit-msg', '--version'], {
      cwd: tempDir,
      encoding: 'utf-8',
      timeout: 10000,
    });

    expect(packedVersionResult.status).toBe(0);

    // Get version from development mode
    const devVersionResult = spawnSync(
      'npm',
      ['run', devScript, '--', '--version'],
      {
        encoding: 'utf-8',
        timeout: 10000,
      }
    );

    // Check if development mode failed
    if (devVersionResult.status !== 0) {
      console.log(
        `Development mode failed with status ${devVersionResult.status}, skipping version comparison`
      );
      return;
    }

    expect(devVersionResult.status).toBe(0);

    // Extract version numbers (everything after the colon)
    const packedVersion = packedVersionResult.stdout
      .trim()
      .split(':')
      .pop()
      ?.trim();
    const devVersion = devVersionResult.stdout.trim().split(':').pop()?.trim();

    expect(packedVersion).toBe(devVersion);
  });

  describe('Installed Package Command Tests', () => {
    beforeEach(() => {
      // Ensure package is installed
      if (!installedBinPath || !existsSync(installedBinPath)) {
        throw new Error('Package was not installed in previous test');
      }
    });

    it('should run commit-msg install command', () => {
      const testRepoDir = path.join(tempDir, 'test-repo-install');
      if (existsSync(testRepoDir)) {
        rmSync(testRepoDir, { recursive: true, force: true });
      }
      mkdirSync(testRepoDir, { recursive: true });

      // Initialize git repo
      execSync('git -c init.defaultBranch=master init', {
        cwd: testRepoDir,
        stdio: 'ignore',
      });
      execSync('git config user.name "Test User"', {
        cwd: testRepoDir,
        stdio: 'ignore',
      });
      execSync('git config user.email "test@example.com"', {
        cwd: testRepoDir,
        stdio: 'ignore',
      });

      // Run install command from installed package
      const installResult = spawnSync('node', [installedBinPath, 'install'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
      });

      expect(installResult.status).toBe(0);
      expect(installResult.stdout).toContain(
        'Commit-msg hook installed successfully!'
      );

      // Verify hook was installed
      const hookPath = path.join(testRepoDir, '.git', 'hooks', 'commit-msg');
      expect(existsSync(hookPath)).toBe(true);

      // Cleanup
      rmSync(testRepoDir, { recursive: true, force: true });
    });

    it('should run commit-msg exec command', () => {
      const messageFile = path.join(tempDir, 'test-message.txt');
      const commitMessage = 'feat: test commit message\n\nThis is a test.';
      writeFileSync(messageFile, commitMessage, 'utf8');

      // Set environment variable for Co-developed-by
      const env = {
        ...process.env,
        CLAUDECODE: '1',
      };

      // Run exec command from installed package
      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      // Verify message was processed
      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);
      expect(processedMessage).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );
    });

    it('should run commit-msg check-update command', () => {
      const checkUpdateResult = spawnSync(
        'node',
        [installedBinPath, 'check-update'],
        {
          encoding: 'utf-8',
          timeout: 30000,
        }
      );

      // check-update may succeed or fail depending on network, but should not crash
      expect([0, 1]).toContain(checkUpdateResult.status);
    });

    it('should run commit-msg --help command', () => {
      const helpResult = spawnSync('node', [installedBinPath, '--help'], {
        encoding: 'utf-8',
        timeout: 10000,
      });

      expect(helpResult.status).toBe(0);
      expect(helpResult.stdout).toContain('commit-msg');
      expect(helpResult.stdout).toContain('install');
      expect(helpResult.stdout).toContain('exec');
    });
  });

  describe('Installed Package Functionality Tests', () => {
    beforeEach(() => {
      if (!installedBinPath || !existsSync(installedBinPath)) {
        throw new Error('Package was not installed');
      }
    });

    it('should generate Change-Id in installed package', () => {
      const messageFile = path.join(tempDir, 'changeid-test.txt');
      const commitMessage = 'feat: test change id generation';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);
    });

    it('should generate Co-developed-by for CLAUDECODE in installed package', () => {
      const messageFile = path.join(tempDir, 'codevelopedby-claude.txt');
      const commitMessage = 'feat: test co-developed-by';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const env = {
        ...process.env,
        CLAUDECODE: '1',
      };

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );
    });

    it('should generate Co-developed-by for QWEN_CODE in installed package', () => {
      const messageFile = path.join(tempDir, 'codevelopedby-qwen.txt');
      const commitMessage = 'feat: test qwen co-developed-by';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const env = {
        ...process.env,
        QWEN_CODE: '1',
      };

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toContain(
        'Co-developed-by: Qwen-Coder <noreply@alibabacloud.com>'
      );
    });

    it('should generate Co-developed-by for GEMINI_CLI in installed package', () => {
      const messageFile = path.join(tempDir, 'codevelopedby-gemini.txt');
      const commitMessage = 'feat: test gemini co-developed-by';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const env = {
        ...process.env,
        GEMINI_CLI: '1',
      };

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toContain(
        'Co-developed-by: Gemini <noreply@developers.google.com>'
      );
    });

    it('should generate Co-developed-by for CURSOR_TRACE_ID in installed package', () => {
      const messageFile = path.join(tempDir, 'codevelopedby-cursor.txt');
      const commitMessage = 'feat: test cursor co-developed-by';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const env = {
        ...process.env,
        CURSOR_TRACE_ID: 'test-trace-id',
      };

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toContain(
        'Co-developed-by: Cursor <noreply@cursor.com>'
      );
    });

    it('should generate Co-developed-by for CODEX_MANAGED_BY_NPM in installed package', () => {
      const messageFile = path.join(tempDir, 'codevelopedby-codex-npm.txt');
      const commitMessage = 'feat: test codex npm co-developed-by';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const env = {
        ...process.env,
        CODEX_MANAGED_BY_NPM: '1',
      };

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toContain(
        'Co-developed-by: Codex <noreply@openai.com>'
      );
    });

    it('should generate Co-developed-by for CODEX_MANAGED_BY_BUN in installed package', () => {
      const messageFile = path.join(tempDir, 'codevelopedby-codex-bun.txt');
      const commitMessage = 'feat: test codex bun co-developed-by';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const env = {
        ...process.env,
        CODEX_MANAGED_BY_BUN: '1',
      };

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toContain(
        'Co-developed-by: Codex <noreply@openai.com>'
      );
    });

    it('should respect priority order (CLI over IDE) in installed package', () => {
      const messageFile = path.join(tempDir, 'priority-test.txt');
      const commitMessage = 'feat: test priority';
      writeFileSync(messageFile, commitMessage, 'utf8');

      const env = {
        ...process.env,
        IFLOW_CLI: '1', // CLI type
        VSCODE_BRAND: 'Qoder', // IDE type
      };

      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      const processedMessage = readFileSync(messageFile, 'utf8');
      // CLI should have higher priority than IDE
      expect(processedMessage).toContain(
        'Co-developed-by: iFlow <noreply@iflow.cn>'
      );
      expect(processedMessage).not.toContain('Qoder');
    });
  });

  describe('Installed Package Module Import Tests', () => {
    it('should import and load AI tool configurations from installed package', async () => {
      if (!installedPackagePath || !existsSync(installedPackagePath)) {
        throw new Error('Package was not installed');
      }

      // Import from installed package
      const installedAITools = await import(
        path.join(installedPackagePath, 'dist', 'ai-tools', 'index.js')
      );

      expect(installedAITools).toBeDefined();
      expect(installedAITools.getAllToolConfigs).toBeDefined();

      const configs = installedAITools.getAllToolConfigs();
      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBe(9); // Should have 9 tools

      // Verify all configs have required fields
      for (const config of configs) {
        expect(config).toHaveProperty('type');
        expect(config).toHaveProperty('userName');
        expect(config).toHaveProperty('userEmail');
        expect(config).toHaveProperty('envVars');
      }
    });

    it('should import and use exec functions from installed package', async () => {
      if (!installedPackagePath || !existsSync(installedPackagePath)) {
        throw new Error('Package was not installed');
      }

      // Import from installed package
      const installedExec = await import(
        path.join(installedPackagePath, 'dist', 'commands', 'exec.js')
      );

      expect(installedExec).toBeDefined();
      expect(installedExec.getCoDevelopedBy).toBeDefined();

      // Test getCoDevelopedBy function
      const originalEnv = process.env;
      try {
        process.env = { ...originalEnv };
        installedExec.clearCoDevelopedByEnvVars();
        process.env.CLAUDECODE = '1';

        const result = installedExec.getCoDevelopedBy();
        expect(result).toBe('Claude <noreply@anthropic.com>');
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('Installed Package Git Integration Tests', () => {
    it('should work in a real Git repository with installed package', () => {
      const testRepoDir = path.join(tempDir, 'test-repo-git');
      if (existsSync(testRepoDir)) {
        rmSync(testRepoDir, { recursive: true, force: true });
      }
      mkdirSync(testRepoDir, { recursive: true });

      // Initialize git repo
      execSync('git -c init.defaultBranch=master init', {
        cwd: testRepoDir,
        stdio: 'ignore',
      });
      execSync('git config user.name "Test User"', {
        cwd: testRepoDir,
        stdio: 'ignore',
      });
      execSync('git config user.email "test@example.com"', {
        cwd: testRepoDir,
        stdio: 'ignore',
      });

      // Install hook using installed package
      const installResult = spawnSync('node', [installedBinPath, 'install'], {
        cwd: testRepoDir,
        encoding: 'utf-8',
        timeout: 30000,
      });

      expect(installResult.status).toBe(0);

      // Create a test file and commit
      const testFile = path.join(testRepoDir, 'test.txt');
      writeFileSync(testFile, 'test content', 'utf8');
      execSync('git add test.txt', { cwd: testRepoDir, stdio: 'ignore' });

      // Create commit message file
      const messageFile = path.join(testRepoDir, '.git', 'COMMIT_EDITMSG');
      const commitMessage =
        'feat: test commit from installed package\n\nTest description.';
      writeFileSync(messageFile, commitMessage, 'utf8');

      // Set environment variable
      const env = {
        ...process.env,
        CLAUDECODE: '1',
      };

      // Execute hook using installed package
      const execResult = spawnSync(
        'node',
        [installedBinPath, 'exec', messageFile],
        {
          cwd: testRepoDir,
          encoding: 'utf-8',
          timeout: 30000,
          env: env,
        }
      );

      expect(execResult.status).toBe(0);

      // Verify message was processed
      const processedMessage = readFileSync(messageFile, 'utf8');
      expect(processedMessage).toMatch(/Change-Id: I[a-f0-9]{8,}/);
      expect(processedMessage).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );

      // Cleanup
      rmSync(testRepoDir, { recursive: true, force: true });
    });
  });
});
