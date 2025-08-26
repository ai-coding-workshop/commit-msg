import { defineConfig } from 'vitest/config';

// Check Node.js version to determine configuration
const nodeVersion = process.version;
const nodeMajorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));

export default defineConfig({
  test: {
    // Enable TypeScript support in test files
    typecheck: {
      enabled: false, // Disable type checking to avoid issues with .ts imports
      include: ['**/*.test.ts'],
    },
    // Configure test environment
    environment: 'node',
    // Set up file extensions that should be treated as modules
    extensions: ['ts', 'tsx', 'js', 'jsx'],
    // Exclude development files from testing
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/src/bin/commit-msg.dev.ts',
    ],
    // Add test timeout for slower environments
    testTimeout: 60000, // 60 seconds
    hookTimeout: 30000, // 30 seconds
  },
  // Configure how to resolve imports in the project
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  // Configure esbuild to handle TypeScript files correctly
  esbuild: {
    target: nodeMajorVersion >= 18 ? `node${nodeMajorVersion}` : 'node18',
    loader: 'ts',
    // Add platform-specific options for better compatibility
    platform: 'node',
    format: 'esm',
  },
});
