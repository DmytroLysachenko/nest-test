import { withTsconfigRootDir } from '@repo/lint-config/base';
import { config as nextConfig } from '@repo/lint-config/next-js';

const config = [
  ...withTsconfigRootDir(nextConfig, import.meta.dirname),
  {
    name: 'web/typescript-conventions',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },
  {
    name: 'web/no-fetch-outside-api-layer',
    files: [
      'src/features/**/ui/**/*.ts',
      'src/features/**/ui/**/*.tsx',
      'src/features/**/model/**/*.ts',
      'src/features/**/model/**/*.tsx',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Use shared API client from feature api layer. Keep network calls out of ui/model.',
        },
      ],
    },
  },
];

export default config;
