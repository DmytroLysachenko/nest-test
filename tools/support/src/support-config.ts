import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type SupportConfig = {
  apiBaseUrl: string;
  workerBaseUrl: string;
  apiBearerToken: string;
  databaseUrl: string;
};

const supportDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(supportDirectory, '..', '..');
const defaultConfigPath = path.resolve(repoRoot, '.support-local', 'support.config.json');

export function loadSupportConfig(): SupportConfig {
  const configPath = process.env.SUPPORT_CONFIG_PATH
    ? path.resolve(process.cwd(), process.env.SUPPORT_CONFIG_PATH)
    : defaultConfigPath;

  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing support config at ${configPath}`);
  }

  const rawConfig = fs.readFileSync(configPath, 'utf8');
  const parsedConfig = JSON.parse(rawConfig) as Partial<SupportConfig>;
  const missingKeys = ['apiBaseUrl', 'workerBaseUrl', 'apiBearerToken', 'databaseUrl'].filter((key) => {
    const value = parsedConfig[key as keyof SupportConfig];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new Error(`Missing required support config keys: ${missingKeys.join(', ')}`);
  }

  return {
    apiBaseUrl: parsedConfig.apiBaseUrl!.trim().replace(/\/$/, ''),
    workerBaseUrl: parsedConfig.workerBaseUrl!.trim().replace(/\/$/, ''),
    apiBearerToken: parsedConfig.apiBearerToken!.trim(),
    databaseUrl: parsedConfig.databaseUrl!.trim(),
  };
}
