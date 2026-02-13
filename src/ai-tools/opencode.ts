import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'cli',
  userName: 'OpenCode',
  userEmail: 'noreply@opencode.ai',
  envVars: [{ key: 'OPENCODE', value: '1' }],
};

export default config;
