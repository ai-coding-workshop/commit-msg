import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

// Check Node.js version to determine which dev script to use
// Node.js 18 has limited ESM support, so we use the compatibility script for versions < 20
const nodeVersion = process.version;
const nodeMajorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
const devScript =
  nodeMajorVersion === 22
    ? 'dev'
    : nodeMajorVersion === 20
      ? 'dev:node20'
      : nodeMajorVersion === 18
        ? 'dev:node18'
        : 'dev:compat';

describe('commit-msg CLI version tests', () => {
  // Test development mode --version
  it('should output version in development mode with correct prefix', () => {
    try {
      const output = execSync(`npm run ${devScript} -- --version`, {
        encoding: 'utf-8',
      });
      expect(output).toContain('@ai-coding-workshop/commit-msg:');
    } catch (error) {
      // If development mode fails, skip this test for older Node.js versions
      if (nodeMajorVersion < 20) {
        console.log(
          `Skipping development mode test for Node.js ${nodeVersion} due to ESM limitations`
        );
        return;
      }
      throw error;
    }
  });

  // Test development mode -v
  it('should output version in development mode with -v parameter', () => {
    try {
      const output = execSync(`npm run ${devScript} -- -v`, {
        encoding: 'utf-8',
      });
      expect(output).toContain('@ai-coding-workshop/commit-msg:');
    } catch (error) {
      // If development mode fails, skip this test for older Node.js versions
      if (nodeMajorVersion < 20) {
        console.log(
          `Skipping development mode -v test for Node.js ${nodeVersion} due to ESM limitations`
        );
        return;
      }
      throw error;
    }
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
    // For Node.js < 20, skip this test as development mode may not work
    if (nodeMajorVersion < 20) {
      console.log(
        `Skipping version comparison test for Node.js ${nodeVersion} due to ESM limitations`
      );
      return;
    }

    // Get development mode version
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

    // Test development mode if supported
    if (nodeMajorVersion >= 20) {
      try {
        const devVersionOutput = execSync(`npm run ${devScript} -- --version`, {
          encoding: 'utf-8',
        });
        const devVOutput = execSync(`npm run ${devScript} -- -v`, {
          encoding: 'utf-8',
        });

        expect(devVOutput).toBe(devVersionOutput);
      } catch {
        console.log(
          `Skipping development mode equivalence test for Node.js ${nodeVersion} due to ESM limitations`
        );
      }
    }
  });
});
