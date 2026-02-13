import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'cli',
  userName: 'iFlow',
  userEmail: 'noreply@iflow.cn',
  envVars: [{ key: 'IFLOW_CLI', value: '1' }],
};

export default config;
