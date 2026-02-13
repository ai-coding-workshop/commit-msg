import type { AIToolConfig } from './index.js';

const config: AIToolConfig = {
  type: 'ide',
  userName: 'Cursor',
  userEmail: 'noreply@cursor.com',
  envVars: [
    { key: 'CURSOR_TRACE_ID', value: '*' },
    { key: 'VSCODE_GIT_ASKPASS_MAIN', value: '**/.cursor-server/**' },
    { key: 'BROWSER', value: '**/.cursor-server/**' },
  ],
};

export default config;
