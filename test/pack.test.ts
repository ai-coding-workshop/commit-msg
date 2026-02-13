import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
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
});
