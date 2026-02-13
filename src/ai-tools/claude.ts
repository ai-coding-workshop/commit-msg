import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'cli',
  userName: 'Claude',
  userEmail: 'noreply@anthropic.com',
  envVars: [{ key: 'CLAUDECODE', value: '1' }],
};

export default config;
