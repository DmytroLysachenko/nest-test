// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import { config as reactInternalConfig } from '@repo/lint-config/react-internal';

const config = [
  ...reactInternalConfig,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off', // This package is not a Next.js app, so disable pages rule.
    },
  },
  ...storybook.configs['flat/recommended'],
];
export default config;
