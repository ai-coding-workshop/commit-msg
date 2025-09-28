import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('CLI Entry Point Consistency', () => {
  it('should have consistent content between commit-msg.ts and commit-msg.dev.ts', () => {
    // Read both files
    const prodContent = readFileSync(
      join(__dirname, '../src/bin/commit-msg.ts'),
      'utf8'
    );
    const devContent = readFileSync(
      join(__dirname, '../src/bin/commit-msg.dev.ts'),
      'utf8'
    );

    // Process dev content to match production content:
    // 1. Replace ".ts'" with ".js'"
    // 2. Remove " for development" string
    const processedDevContent = devContent
      // eslint-disable-next-line quotes
      .replace(/\.ts'/g, ".js'")
      .replace(/ for development/g, '');

    // Compare the contents
    expect(processedDevContent).toBe(prodContent);
  });
});
