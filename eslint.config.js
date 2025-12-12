import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': 'warn',
    },
  },
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'node_modules/**',
      '_backup_angular/**',
      '_trash_modules/**',
      '*.cjs',
      'test.mjs',
    ],
  }
);
