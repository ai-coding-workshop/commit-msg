import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

describe('commit-msg CLI version tests', () => {
  // Test development mode --version
  it('should output version in development mode with correct prefix', () => {
    const output = execSync('npm run dev -- --version', {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test development mode -v
  it('should output version in development mode with -v parameter', () => {
    const output = execSync('npm run dev -- -v', {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test production mode --version
  it('should output version in production mode with correct prefix', () => {
    execSync('npm run build', { stdio: 'inherit' });
    const output = execSync('node dist/bin/commit-msg.js --version', {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test production mode -v
  it('should output version in production mode with -v parameter', () => {
    execSync('npm run build', { stdio: 'inherit' });
    const output = execSync('node dist/bin/commit-msg.js -v', {
      encoding: 'utf-8',
    });
    expect(output).toContain('@ai-coding-workshop/commit-msg:');
  });

  // Test that both modes output the same version
  it('should output the same version in both development and production modes', () => {
    const devOutput = execSync('npm run dev -- --version', {
      encoding: 'utf-8',
    });

    execSync('npm run build', { stdio: 'inherit' });
    const prodOutput = execSync('node dist/bin/commit-msg.js --version', {
      encoding: 'utf-8',
    });

    const devVersion = devOutput.trim().split(':').pop()?.trim();
    const prodVersion = prodOutput.trim().split(':').pop()?.trim();

    expect(devVersion).toBe(prodVersion);
  });

  // Test that -v and --version produce the same output
  it('should produce the same output for -v and --version parameters', () => {
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
    const devVersionOutput = execSync('npm run dev -- --version', {
      encoding: 'utf-8',
    });
    const devVOutput = execSync('npm run dev -- -v', {
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

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const packageJsonVersion = packageJson.version;

    const packageLockJson = JSON.parse(
      readFileSync(packageLockJsonPath, 'utf-8')
    );
    const packageLockJsonVersion = packageLockJson.version;

    expect(packageJsonVersion).toBe(packageLockJsonVersion);

    const rootPackage = packageLockJson.packages[''];
    expect(rootPackage).toBeDefined();
    expect(rootPackage.version).toBe(packageJsonVersion);
    expect(rootPackage.name).toBe(packageJson.name);
  });
});
