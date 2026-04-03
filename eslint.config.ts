import { config as baseConfig, withTsconfigRootDir } from '@repo/lint-config/base';

const config = [
  ...withTsconfigRootDir(baseConfig, import.meta.dirname),
  {
    ignores: ['apps/**', 'packages/**'],
  },
];

export default config;
