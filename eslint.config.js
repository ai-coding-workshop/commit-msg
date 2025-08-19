import eslint from '@eslint/js';
import pluginJs from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    ignores: [
      'dist/',
      'node_modules/',
      'eslint.config.js',
      'packages/*/dist',
      'scripts/',
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: join(__dirname, 'tsconfig.eslint.json'),
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    },
  },
];
