import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/require-await': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-empty': 'warn',

      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',

      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: ['**/dist/**', '**/.turbo/**', '**/node_modules/**', '**/__tests__/fixtures/**'],
  },
);
