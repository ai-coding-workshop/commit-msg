import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'cli',
  userName: 'Gemini',
  userEmail: 'noreply@developers.google.com',
  envVars: [{ key: 'GEMINI_CLI', value: '1' }],
};

export default config;
