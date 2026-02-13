import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'ide',
  userName: 'Qoder',
  userEmail: 'noreply@qoder.com',
  envVars: [
    { key: 'VSCODE_BRAND', value: 'Qoder' },
    { key: '__CFBundleIdentifier', value: 'com.qoder.ide' },
    { key: 'VSCODE_GIT_ASKPASS_MAIN', value: '**/.qoder-server/**' },
    { key: 'BROWSER', value: '**/.qoder-server/**' },
  ],
};

export default config;
