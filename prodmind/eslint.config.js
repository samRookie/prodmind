import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import importX from 'eslint-plugin-import-x';

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
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        node: true,
      },
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'import-x': importX,
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

      'import-x/no-cycle': ['error', { maxDepth: Infinity }],
      'import-x/no-relative-packages': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'warn',

      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@prodmind/*/src/**', '@prodmind/*/internal/**'],
            message: 'Deep imports into package internals are forbidden. Use the package\'s public export map.',
          },
        ],
      }],
    },
  },
  {
    files: ['packages/contracts/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prodmind/*'], message: '@prodmind/contracts is a leaf package and cannot import from other packages' },
        ],
      }],
    },
  },
  {
    files: ['packages/shared/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prodmind/parser', '@prodmind/parser/*'], message: '@prodmind/shared cannot depend on @prodmind/parser' },
          { group: ['@prodmind/db', '@prodmind/db/*'], message: '@prodmind/shared cannot depend on @prodmind/db' },
          { group: ['@prodmind/ai', '@prodmind/ai/*'], message: '@prodmind/shared cannot depend on @prodmind/ai' },
        ],
      }],
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prodmind/parser', '@prodmind/parser/*'], message: '@prodmind/core cannot depend on @prodmind/parser' },
          { group: ['@prodmind/db', '@prodmind/db/*'], message: '@prodmind/core cannot depend on @prodmind/db' },
          { group: ['@prodmind/ai', '@prodmind/ai/*'], message: '@prodmind/core cannot depend on @prodmind/ai' },
        ],
      }],
    },
  },
  {
    files: ['packages/db/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prodmind/shared', '@prodmind/shared/*'], message: '@prodmind/db cannot depend on @prodmind/shared' },
          { group: ['@prodmind/parser', '@prodmind/parser/*'], message: '@prodmind/db cannot depend on @prodmind/parser' },
          { group: ['@prodmind/ai', '@prodmind/ai/*'], message: '@prodmind/db cannot depend on @prodmind/ai' },
        ],
      }],
    },
  },
  {
    files: ['packages/parser/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prodmind/ai', '@prodmind/ai/*'], message: '@prodmind/parser cannot depend on @prodmind/ai' },
        ],
      }],
    },
  },
  {
    files: ['packages/session/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prodmind/ai', '@prodmind/ai/*'], message: '@prodmind/session cannot depend on @prodmind/ai' },
          { group: ['@prodmind/parser', '@prodmind/parser/*'], message: '@prodmind/session cannot depend on @prodmind/parser' },
        ],
      }],
    },
  },
  {
    files: ['packages/ai/src/**/*.ts'],
    rules: {},
  },
  {
    files: ['apps/server/src/**/*.ts'],
    rules: {},
  },
  {
    files: ['apps/web/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prodmind/db', '@prodmind/db/*'], message: '@prodmind/web cannot import from @prodmind/db' },
        ],
      }],
    },
  },
  {
    ignores: ['**/dist/**', '**/.turbo/**', '**/node_modules/**', '**/__tests__/fixtures/**'],
  },
);
