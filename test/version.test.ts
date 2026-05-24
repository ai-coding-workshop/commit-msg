import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// All dev scripts now use tsx which supports Node.js 18+
const nodeVersion = process.version;
const nodeMajorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
const devScript =
  nodeMajorVersion >= 21
    ? 'dev'
    : nodeMajorVersion === 20
      ? 'dev:node20'
      : nodeMajorVersion === 18
        ? 'dev:node18'
        : 'dev:compat';

describe('commit-msg CLI version tests', () => {
  // Test development mode --version
  it('should output version in development mode with correct prefix', () => {
    const output = execSync(`npm run ${devScript} -- --version`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test development mode -v
  it('should output version in development mode with -v parameter', () => {
    const output = execSync(`npm run ${devScript} -- -v`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test production mode --version
  it('should output version in production mode with correct prefix', () => {
    // First build the project
    execSync('npm run build', { stdio: 'inherit' });

    // Then test the compiled version
    const output = execSync('node dist/bin/commit-msg.js --version', {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test production mode -v
  it('should output version in production mode with -v parameter', () => {
    // First build the project
    execSync('npm run build', { stdio: 'inherit' });

    // Then test the compiled version with -v
    const output = execSync('node dist/bin/commit-msg.js -v', {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test that both modes output the same version
  it('should output the same version in both development and production modes', () => {
    const devOutput = execSync(`npm run ${devScript} -- --version`, {
      encoding: 'utf-8',
    });

    // Build and get production mode version
    execSync('npm run build', { stdio: 'inherit' });
    const prodOutput = execSync('node dist/bin/commit-msg.js --version', {
      encoding: 'utf-8',
    });

    // Extract version numbers (everything after the colon)
    const devVersion = devOutput.trim().split(':').pop()?.trim();
    const prodVersion = prodOutput.trim().split(':').pop()?.trim();

    expect(devVersion).toBe(prodVersion);
  });

  // Test that -v and --version produce the same output
  it('should produce the same output for -v and --version parameters', () => {
    // Build the project first
    execSync('npm run build', { stdio: 'inherit' });

    // Test production mode
    const versionOutput = execSync('node dist/bin/commit-msg.js --version', {
      encoding: 'utf-8',
    });
    const vOutput = execSync('node dist/bin/commit-msg.js -v', {
      encoding: 'utf-8',
    });

    expect(vOutput).toBe(versionOutput);

    // Test development mode — compare only the version line (npm echoes
    // the invoked command which differs between -v and --version)
    const devVersionOutput = execSync(`npm run ${devScript} -- --version`, {
      encoding: 'utf-8',
    });
    const devVOutput = execSync(`npm run ${devScript} -- -v`, {
      encoding: 'utf-8',
    });

    const extractVersion = (out: string) =>
      out
        .split('\n')
        .find((l) => l.startsWith('@ai-coding-workshop/commit-msg:'));
    expect(extractVersion(devVOutput)).toBe(extractVersion(devVersionOutput));
  });

  // Test that package.json and package-lock.json versions are in sync
  it('should have consistent version in package.json and package-lock.json', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const rootDir = join(__dirname, '..');
    const packageJsonPath = join(rootDir, 'package.json');
    const packageLockJsonPath = join(rootDir, 'package-lock.json');

    // Read and parse package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const packageJsonVersion = packageJson.version;

    // Read and parse package-lock.json
    const packageLockJson = JSON.parse(
      readFileSync(packageLockJsonPath, 'utf-8')
    );
    const packageLockJsonVersion = packageLockJson.version;

    expect(packageJsonVersion).toBe(packageLockJsonVersion);

    // Also check the version in packages field (root package entry)
    const rootPackage = packageLockJson.packages[''];
    expect(rootPackage).toBeDefined();
    expect(rootPackage.version).toBe(packageJsonVersion);
    expect(rootPackage.name).toBe(packageJson.name);
  });
});
