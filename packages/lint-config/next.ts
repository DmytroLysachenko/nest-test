// @ts-expect-error This package has no type definitions
import pluginNext from '@next/eslint-plugin-next';
import type { FlatConfig } from '@typescript-eslint/utils/ts-eslint';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

import { config as baseConfig } from './base.js';

const nextJsConfig = [
  {
    name: 'base/next/config',
    // Plugin config
    plugins: {
      react: pluginReact, // React core plugin
      'jsx-a11y': pluginJsxA11y, // Accessibility checks
      'react-hooks': pluginReactHooks, // React Hooks rules
      '@next/next': pluginNext, // Next.js specific rules
    },
    rules: {
      // React rules
      ...pluginReact.configs.recommended.rules,
      ...pluginReact.configs['jsx-runtime'].rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules, // Next.js strict mode
      ...pluginJsxA11y.configs.strict.rules,

      // Custom rule adjustments
      // react
      'react/no-unknown-property': 'off', // Disable unknown property checks
      'react/react-in-jsx-scope': 'off', // No need to import React
      'react/prop-types': 'off', // Disable PropTypes checks
      'react/jsx-no-target-blank': 'off', // Allow target="_blank"

      // Accessibility warnings
      'jsx-a11y/alt-text': [
        'warn',
        {
          elements: ['img'],
          img: ['Image'],
        },
      ],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
    },
    // Global settings
    settings: {
      react: {
        version: 'detect', // Auto-detect React version
      },
    },
  },
] as FlatConfig.Config[];

export const config = [...baseConfig, ...nextJsConfig] satisfies FlatConfig.Config[];
