// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import { withTsconfigRootDir } from '@repo/lint-config/base';
import { config as reactInternalConfig } from '@repo/lint-config/react-internal';

import type { EslintFlatConfig } from '@repo/lint-config/base';

const config: EslintFlatConfig[] = [
  ...withTsconfigRootDir(reactInternalConfig, import.meta.dirname),
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off', // This package is not a Next.js app, so disable pages rule.
    },
  },
  ...storybook.configs['flat/recommended'],
];
export default config;
