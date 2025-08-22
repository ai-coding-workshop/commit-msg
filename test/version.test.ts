import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';

describe('commit-msg CLI --version tests', () => {
  // Test development mode --version
  it('should output version in development mode with correct prefix', () => {
    const output = execSync('npm run dev -- --version', { encoding: 'utf-8' });
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

  // Test that both modes output the same version
  it('should output the same version in both development and production modes', () => {
    // Get development mode version
    const devOutput = execSync('npm run dev -- --version', {
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
});
