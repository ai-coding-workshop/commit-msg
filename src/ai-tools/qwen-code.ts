import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'cli',
  userName: 'Qwen-Coder',
  userEmail: 'noreply@alibabacloud.com',
  envVars: [{ key: 'QWEN_CODE', value: '1' }],
};

export default config;
