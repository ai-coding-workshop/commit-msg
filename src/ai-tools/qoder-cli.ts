import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'cli',
  userName: 'Qoder CLI',
  userEmail: 'noreply@qoder.com',
  envVars: [{ key: 'QODER_CLI', value: '1' }],
};

export default config;
