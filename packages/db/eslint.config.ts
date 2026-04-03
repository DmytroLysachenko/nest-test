import { config, withTsconfigRootDir } from '@repo/lint-config/base';

export default withTsconfigRootDir(config, import.meta.dirname);
