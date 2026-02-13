import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'ide',
  userName: 'Kiro',
  userEmail: 'noreply@kiro.dev',
  envVars: [{ key: '__CFBundleIdentifier', value: 'dev.kiro.desktop' }],
};

export default config;
