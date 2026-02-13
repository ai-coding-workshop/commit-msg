/**
 * AI Tools Configuration
 *
 * This module provides type definitions and configuration loading for AI coding tools.
 * Each tool has its own configuration file that specifies environment variables to detect
 * the tool and the corresponding Co-developed-by trailer value.
 */

/**
 * Type of AI coding tool
 * - 'cli': Command-line interface tools (highest priority, can run inside IDEs)
 * - 'plugin': IDE plugin tools (medium priority)
 * - 'ide': IDE environment variables (low priority)
 * - 'others': Other tools (lowest priority)
 */
export type AIToolType = 'cli' | 'plugin' | 'ide' | 'others';

/**
 * Environment variable configuration
 */
export interface EnvVarConfig {
  /** Environment variable key */
  key: string;
  /** Expected value pattern (supports glob patterns, '*' for any non-empty value, or exact match) */
  value: string;
}

/**
 * AI tool configuration
 */
export interface AIToolConfig {
  /** Type of the tool (determines priority) */
  type: AIToolType;
  /** User name for Co-developed-by trailer */
  userName: string;
  /** User email address for Co-developed-by trailer */
  userEmail: string;
  /** List of environment variable configurations to check */
  envVars: EnvVarConfig[];
}

/**
 * Priority order for tool types (lower number = higher priority)
 */
const TYPE_PRIORITY: Record<AIToolType, number> = {
  cli: 1,
  plugin: 2,
  ide: 3,
  others: 4,
};

/**
 * Compare two tool configs by priority
 * @param a First tool config
 * @param b Second tool config
 * @returns Comparison result for sorting
 */
function compareByPriority(a: AIToolConfig, b: AIToolConfig): number {
  const priorityA = TYPE_PRIORITY[a.type];
  const priorityB = TYPE_PRIORITY[b.type];

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  // If same type, maintain original order (by import order)
  return 0;
}

// Import all tool configurations
import claudeConfig from './claude.js';
import codexConfig from './codex.js';
import cursorConfig from './cursor.js';
import geminiConfig from './gemini.js';
import iflowConfig from './iflow.js';
import kiroConfig from './kiro.js';
import qoderCliConfig from './qoder-cli.js';
import qoderIdeConfig from './qoder-ide.js';
import qwenCodeConfig from './qwen-code.js';

/**
 * All AI tool configurations
 * Sorted by priority: CLI → PLUGIN → IDE → OTHERS
 */
const allConfigs: AIToolConfig[] = [
  claudeConfig,
  codexConfig,
  iflowConfig,
  qwenCodeConfig,
  geminiConfig,
  qoderCliConfig,
  cursorConfig,
  kiroConfig,
  qoderIdeConfig,
].sort(compareByPriority);

/**
 * Get all AI tool configurations sorted by priority
 * @returns Array of tool configurations sorted by type priority
 */
export function getAllToolConfigs(): readonly AIToolConfig[] {
  return allConfigs;
}

/**
 * Convert AIToolConfig to the legacy format [envVarString, coDevelopedByString]
 * This is used for backward compatibility with existing code
 * @param config Tool configuration
 * @returns Array of [envVarString, coDevelopedByString] tuples
 */
export function configToLegacyFormat(
  config: AIToolConfig
): Array<[string, string]> {
  const coDevelopedBy = `${config.userName} <${config.userEmail}>`;
  return config.envVars.map((envVar) => {
    const envVarString = `${envVar.key}=${envVar.value}`;
    return [envVarString, coDevelopedBy] as [string, string];
  });
}

/**
 * Get all configurations in legacy format for backward compatibility
 * @returns Array of [envVarString, coDevelopedByString] tuples
 */
export function getAllConfigsInLegacyFormat(): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  for (const config of allConfigs) {
    result.push(...configToLegacyFormat(config));
  }
  return result;
}
