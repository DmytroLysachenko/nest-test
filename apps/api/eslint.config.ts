import { withTsconfigRootDir } from '@repo/lint-config/base';
import { config } from '@repo/lint-config/nest-js';

export default withTsconfigRootDir(config, import.meta.dirname);
