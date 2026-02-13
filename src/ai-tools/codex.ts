import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'cli',
  userName: 'Codex',
  userEmail: 'noreply@openai.com',
  envVars: [
    { key: 'CODEX_MANAGED_BY_NPM', value: '1' },
    { key: 'CODEX_MANAGED_BY_BUN', value: '1' },
  ],
};

export default config;
