const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export type ResetBundleOptions = {
  applyChanges: boolean;
  runPostAudit: boolean;
  strictPostAudit: boolean;
};

const parseBoolean = (value: string | undefined | null) => TRUE_VALUES.has((value ?? '').trim().toLowerCase());

export const resolveResetBundleOptions = (env: Record<string, string | undefined>): ResetBundleOptions => {
  const applyChanges = parseBoolean(env.APPLY_CHANGES);
  const runPostAudit =
    env.RESET_BUNDLE_RUN_POST_AUDIT == null ? applyChanges : parseBoolean(env.RESET_BUNDLE_RUN_POST_AUDIT);

  return {
    applyChanges,
    runPostAudit,
    strictPostAudit: parseBoolean(env.RESET_BUNDLE_STRICT_POST_AUDIT),
  };
};
