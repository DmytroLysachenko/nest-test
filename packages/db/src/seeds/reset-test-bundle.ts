import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { config } from 'dotenv';

import { resolveResetBundleOptions } from './reset-test-bundle-core';

config();

const tsxCliPath = require.resolve('tsx/dist/cli.mjs');
const currentDir = __dirname;

const parseJsonOutput = (stdout: string, label: string) => {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `${label} did not return valid JSON. Output was: ${stdout.slice(0, 500)}${stdout.length > 500 ? '...' : ''}`,
      { cause: error },
    );
  }
};

const runScript = (scriptName: string, envOverrides: Record<string, string>) => {
  const scriptPath = path.join(currentDir, scriptName);
  const result = spawnSync(process.execPath, [tsxCliPath, scriptPath], {
    cwd: path.resolve(currentDir, '..', '..', '..'),
    env: {
      ...process.env,
      ...envOverrides,
    },
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${scriptName} failed with status ${result.status}. stderr: ${result.stderr || '<empty>'}. stdout: ${result.stdout || '<empty>'}`,
    );
  }

  return parseJsonOutput(result.stdout, scriptName);
};

async function main() {
  const options = resolveResetBundleOptions(process.env);
  const preAudit = runScript('audit-reset-readiness.ts', {
    RESET_VERIFY_PHASE: 'pre-reset',
    RESET_VERIFY_STRICT: 'false',
  });
  const resetResult = runScript('reset-test-data.ts', {});

  const bundle: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    mode: options.applyChanges ? 'apply' : 'preview',
    options,
    preResetAudit: preAudit,
    reset: resetResult,
  };

  if (options.runPostAudit) {
    const postAudit = runScript('audit-reset-readiness.ts', {
      RESET_VERIFY_PHASE: 'post-reset',
      RESET_VERIFY_STRICT: 'false',
    });
    bundle.postResetAudit = postAudit;

    if (options.strictPostAudit && postAudit.overallStatus === 'fail') {
      console.log(JSON.stringify(bundle, null, 2));
      process.exitCode = 1;
      return;
    }
  }

  console.log(JSON.stringify(bundle, null, 2));
}

main().catch((error) => {
  console.error('Reset bundle execution failed:', error);
  process.exitCode = 1;
});
