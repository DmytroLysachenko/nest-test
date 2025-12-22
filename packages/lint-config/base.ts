import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
// import onlyWarn from 'eslint-plugin-only-warn'; // TODO: enable only in production.
import type { FlatConfig } from '@typescript-eslint/utils/ts-eslint';

import gitignore from 'eslint-config-flat-gitignore';
import pluginImportX from 'eslint-plugin-import-x';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import turboPlugin from 'eslint-plugin-turbo';
import globals from 'globals';
import tseslint, { configs as tseslintConfigs } from 'typescript-eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

// =========================================
// Base ESLint config
// =========================================
const eslintConfig = [
  {
    name: 'base/eslint/recommended',
    files: ['**/*.js?(x)', '**/*.mjs'],
    ...js.configs.recommended,
  },
] as FlatConfig.Config[];

// =========================================
// TypeScript ESLint config
// =========================================
const tseslintConfig = tseslint.config(
  {
    name: 'base/typescript-eslint/recommended',
    files: ['**/*.mjs', '**/*.ts?(x)'],
    extends: [...tseslintConfigs.recommended] as FlatConfig.ConfigArray,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2023,
        ...globals.jest,
      },
      parserOptions: {
        // Enable type-aware linting
        projectService: true,

        project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],

        // it is recommended to keep version warnings turned on
        warnOnUnsupportedTypeScriptVersion: true,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // Disable type-aware linting for .mjs files
    files: ['**/*.mjs'],
    ...tseslintConfigs.disableTypeChecked,
    name: 'base/typescript-eslint/disable-type-checked',
  },
);

// =========================================
// Ignore files config
// =========================================
const ignoresConfig = [
  {
    name: 'base/eslint/ignores',
    // Use a dedicated config block instead of .eslintignore
    ignores: [...gitignore().ignores],
  },
] as FlatConfig.Config[];

// =========================================
// Import config
// =========================================
const importConfig = [
  pluginImportX.flatConfigs.recommended,
  pluginImportX.flatConfigs.typescript,
  pluginImportX.flatConfigs.react,
  {
    name: 'base/import/recommended',
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'import-x/no-anonymous-default-export': 'warn', // Warn on anonymous default exports
      // 'import-x/order': 'off', // Disable if it conflicts with Prettier
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'object', 'type'],
          'newlines-between': 'always',
        },
      ],
      'import-x/first': 'error', // Enforce imports at the top
      'import-x/newline-after-import': 'error', // Require a blank line after imports
      'import-x/no-duplicates': 'error', // Disallow duplicate imports
      'import-x/no-unresolved': 'error', // Disallow unresolved imports
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
        }),
      ],
    },
    // settings: {
    //   'import/resolver': {
    //     typescript: true,
    //     node: true,
    //   },
    // },
  },
] as FlatConfig.Config[];

// =========================================
// Turbo config
// =========================================
const turboConfig = [
  {
    name: 'base/turbo/recommended',
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
] as FlatConfig.Config[];

// =========================================
// prettier
// =========================================
const prettierConfig = [
  pluginPrettierRecommended as FlatConfig.Config,
  {
    name: 'base/prettier/custom',
    rules: {
      'prettier/prettier': [
        'error',
        {
          printWidth: 120,
        },
      ],
    },
  },
] as FlatConfig.Config[];

export const config = [
  ...eslintConfig,
  ...tseslintConfig,
  ...importConfig,
  ...turboConfig,
  ...ignoresConfig,
  ...prettierConfig,
] satisfies FlatConfig.Config[];
