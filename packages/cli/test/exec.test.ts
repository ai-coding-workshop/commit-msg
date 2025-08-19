import { describe, it, expect } from 'vitest';
import { exec } from '../src/commands/exec';

describe('exec command', () => {
  it('should be a function', () => {
    expect(typeof exec).toBe('function');
  });

  // Add more tests here as the implementation grows
});
