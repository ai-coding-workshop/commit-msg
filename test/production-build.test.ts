/**
 * Production Build Tests
 *
 * These tests verify that the compiled production code (dist/) works correctly.
 * This ensures that TypeScript compilation doesn't introduce runtime issues,
 * especially with ESM module imports and configuration loading.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Import production build modules
let productionAITools: typeof import('../dist/ai-tools/index.js');
let productionExec: typeof import('../dist/commands/exec.js');

describe('Production Build Tests', () => {
  beforeAll(async () => {
    // Ensure the project is built before running tests
    if (!existsSync(join(process.cwd(), 'dist', 'ai-tools', 'index.js'))) {
      console.log('Building project before running production tests...');
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Dynamically import production modules
    productionAITools = await import('../dist/ai-tools/index.js');
    productionExec = await import('../dist/commands/exec.js');
  });

  describe('Module Import Tests', () => {
    it('should successfully import production AI tools module', () => {
      expect(productionAITools).toBeDefined();
      expect(productionAITools.getAllToolConfigs).toBeDefined();
      expect(typeof productionAITools.getAllToolConfigs).toBe('function');
    });

    it('should successfully import production exec module', () => {
      expect(productionExec).toBeDefined();
      expect(productionExec.getCoDevelopedBy).toBeDefined();
      expect(typeof productionExec.getCoDevelopedBy).toBe('function');
    });

    it('should load all tool configurations', () => {
      const configs = productionAITools.getAllToolConfigs();
      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Structure Tests', () => {
    it('should have correct number of tool configurations', () => {
      const configs = productionAITools.getAllToolConfigs();
      // Should have 9 tools: claude, codex, iflow, qwen-code, gemini, qoder-cli, cursor, kiro, qoder-ide
      expect(configs.length).toBe(9);
    });

    it('should have all required fields in each configuration', () => {
      const configs = productionAITools.getAllToolConfigs();
      for (const config of configs) {
        expect(config).toHaveProperty('type');
        expect(config).toHaveProperty('userName');
        expect(config).toHaveProperty('userEmail');
        expect(config).toHaveProperty('envVars');
        expect(typeof config.type).toBe('string');
        expect(typeof config.userName).toBe('string');
        expect(typeof config.userEmail).toBe('string');
        expect(Array.isArray(config.envVars)).toBe(true);
        expect(config.userName.length).toBeGreaterThan(0);
        expect(config.userEmail.length).toBeGreaterThan(0);
        expect(config.envVars.length).toBeGreaterThan(0);
      }
    });

    it('should have valid tool types', () => {
      const configs = productionAITools.getAllToolConfigs();
      const validTypes = ['cli', 'plugin', 'ide', 'others'];
      for (const config of configs) {
        expect(validTypes).toContain(config.type);
      }
    });

    it('should have valid email format in configurations', () => {
      const configs = productionAITools.getAllToolConfigs();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const config of configs) {
        expect(emailRegex.test(config.userEmail)).toBe(true);
      }
    });

    it('should have valid environment variable configurations', () => {
      const configs = productionAITools.getAllToolConfigs();
      for (const config of configs) {
        for (const envVar of config.envVars) {
          expect(envVar).toHaveProperty('key');
          expect(envVar).toHaveProperty('value');
          expect(typeof envVar.key).toBe('string');
          expect(typeof envVar.value).toBe('string');
          expect(envVar.key.length).toBeGreaterThan(0);
          expect(envVar.value.length).toBeGreaterThan(0);
        }
      }
    });

    it('should be sorted by priority (CLI → PLUGIN → IDE → OTHERS)', () => {
      const configs = productionAITools.getAllToolConfigs();
      const typePriority: Record<string, number> = {
        cli: 1,
        plugin: 2,
        ide: 3,
        others: 4,
      };

      for (let i = 1; i < configs.length; i++) {
        const prevPriority = typePriority[configs[i - 1].type] || 999;
        const currPriority = typePriority[configs[i].type] || 999;
        expect(currPriority).toBeGreaterThanOrEqual(prevPriority);
      }
    });

    it('should have all expected tool configurations', () => {
      const configs = productionAITools.getAllToolConfigs();
      const toolNames = configs.map((c) => c.userName);
      const expectedTools = [
        'Codex',
        'Claude',
        'iFlow',
        'Qwen-Coder',
        'Gemini',
        'Qoder CLI',
        'Cursor',
        'Kiro',
        'Qoder',
      ];

      expect(toolNames.length).toBe(expectedTools.length);
      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });
  });

  describe('Functionality Tests', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment variables before each test
      process.env = { ...originalEnv };
      // Clear all AI tool environment variables
      productionExec.clearCoDevelopedByEnvVars();
    });

    afterEach(() => {
      // Restore original environment variables
      process.env = originalEnv;
    });

    it('should return Claude CoDevelopedBy when CLAUDECODE=1 is set', () => {
      process.env.CLAUDECODE = '1';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Claude <noreply@anthropic.com>');
    });

    it('should return Qwen-Coder CoDevelopedBy when QWEN_CODE=1 is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.QWEN_CODE = '1';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Qwen-Coder <noreply@alibabacloud.com>');
    });

    it('should return Gemini CoDevelopedBy when GEMINI_CLI=1 is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.GEMINI_CLI = '1';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Gemini <noreply@developers.google.com>');
    });

    it('should return iFlow CoDevelopedBy when IFLOW_CLI=1 is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.IFLOW_CLI = '1';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('iFlow <noreply@iflow.cn>');
    });

    it('should return Qoder CLI CoDevelopedBy when QODER_CLI=1 is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.QODER_CLI = '1';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Qoder CLI <noreply@qoder.com>');
    });

    it('should return Cursor CoDevelopedBy when CURSOR_TRACE_ID is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.CURSOR_TRACE_ID = 'any-value';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Cursor <noreply@cursor.com>');
    });

    it('should return Codex CoDevelopedBy when CODEX_MANAGED_BY_NPM=1 is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.CODEX_MANAGED_BY_NPM = '1';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Codex <noreply@openai.com>');
    });

    it('should return Codex CoDevelopedBy when CODEX_MANAGED_BY_BUN=1 is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.CODEX_MANAGED_BY_BUN = '1';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Codex <noreply@openai.com>');
    });

    it('should return Kiro CoDevelopedBy when __CFBundleIdentifier=dev.kiro.desktop is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.__CFBundleIdentifier = 'dev.kiro.desktop';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Kiro <noreply@kiro.dev>');
    });

    it('should return Qoder CoDevelopedBy when VSCODE_BRAND=Qoder is set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.VSCODE_BRAND = 'Qoder';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Qoder <noreply@qoder.com>');
    });

    it('should respect priority order (CLI over IDE)', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.IFLOW_CLI = '1';
      process.env.__CFBundleIdentifier = 'dev.kiro.desktop';
      process.env.VSCODE_BRAND = 'Qoder';
      const result = productionExec.getCoDevelopedBy();
      // CLI should have higher priority than IDE
      expect(result).toBe('iFlow <noreply@iflow.cn>');
    });

    it('should respect priority order (CLI over CLI)', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.CLAUDECODE = '1';
      process.env.QWEN_CODE = '1';
      process.env.GEMINI_CLI = '1';
      const result = productionExec.getCoDevelopedBy();
      // First CLI in order should win
      expect(result).toBe('Claude <noreply@anthropic.com>');
    });

    it('should return empty string when no environment variables are set', () => {
      productionExec.clearCoDevelopedByEnvVars();
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('');
    });

    it('should return empty string when environment variables are set to falsy values', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.CLAUDECODE = '0';
      process.env.QWEN_CODE = 'false';
      process.env.GEMINI_CLI = '';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('');
    });

    it('should handle glob pattern matching for Cursor', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.VSCODE_GIT_ASKPASS_MAIN =
        '/home/user/.cursor-server/bin/askpass-main.js';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Cursor <noreply@cursor.com>');
    });

    it('should handle glob pattern matching for Qoder', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.VSCODE_GIT_ASKPASS_MAIN =
        '/home/user/.qoder-server/bin/askpass-main.js';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Qoder <noreply@qoder.com>');
    });

    it('should handle BROWSER environment variable for Cursor', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.BROWSER = '/home/user/.cursor-server/bin/helpers/browser.sh';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Cursor <noreply@cursor.com>');
    });

    it('should handle BROWSER environment variable for Qoder', () => {
      productionExec.clearCoDevelopedByEnvVars();
      process.env.BROWSER = '/home/user/.qoder-server/bin/helpers/browser.sh';
      const result = productionExec.getCoDevelopedBy();
      expect(result).toBe('Qoder <noreply@qoder.com>');
    });
  });

  describe('Development vs Production Consistency', () => {
    // Import development modules for comparison
    let devAITools: typeof import('../src/ai-tools/index.js');
    let devExec: typeof import('../src/commands/exec.js');

    beforeAll(async () => {
      // Dynamically import development modules
      devAITools = await import('../src/ai-tools/index.js');
      devExec = await import('../src/commands/exec.js');
    });

    it('should have the same number of configurations in dev and production', () => {
      const devConfigs = devAITools.getAllToolConfigs();
      const prodConfigs = productionAITools.getAllToolConfigs();
      expect(prodConfigs.length).toBe(devConfigs.length);
    });

    it('should have the same tool names in dev and production', () => {
      const devConfigs = devAITools.getAllToolConfigs();
      const prodConfigs = productionAITools.getAllToolConfigs();
      const devNames = devConfigs.map((c) => c.userName).sort();
      const prodNames = prodConfigs.map((c) => c.userName).sort();
      expect(prodNames).toEqual(devNames);
    });

    it('should produce the same CoDevelopedBy result for CLAUDECODE=1', () => {
      const originalEnv = process.env;
      try {
        process.env = { ...originalEnv };
        devExec.clearCoDevelopedByEnvVars();
        productionExec.clearCoDevelopedByEnvVars();
        process.env.CLAUDECODE = '1';

        const devResult = devExec.getCoDevelopedBy();
        const prodResult = productionExec.getCoDevelopedBy();

        expect(prodResult).toBe(devResult);
        expect(prodResult).toBe('Claude <noreply@anthropic.com>');
      } finally {
        process.env = originalEnv;
      }
    });

    it('should produce the same CoDevelopedBy result for QWEN_CODE=1', () => {
      const originalEnv = process.env;
      try {
        process.env = { ...originalEnv };
        devExec.clearCoDevelopedByEnvVars();
        productionExec.clearCoDevelopedByEnvVars();
        process.env.QWEN_CODE = '1';

        const devResult = devExec.getCoDevelopedBy();
        const prodResult = productionExec.getCoDevelopedBy();

        expect(prodResult).toBe(devResult);
        expect(prodResult).toBe('Qwen-Coder <noreply@alibabacloud.com>');
      } finally {
        process.env = originalEnv;
      }
    });

    it('should produce the same empty result when no env vars are set', () => {
      const originalEnv = process.env;
      try {
        process.env = { ...originalEnv };
        devExec.clearCoDevelopedByEnvVars();
        productionExec.clearCoDevelopedByEnvVars();

        const devResult = devExec.getCoDevelopedBy();
        const prodResult = productionExec.getCoDevelopedBy();

        expect(prodResult).toBe(devResult);
        expect(prodResult).toBe('');
      } finally {
        process.env = originalEnv;
      }
    });
  });
});
