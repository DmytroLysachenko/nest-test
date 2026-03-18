export const APP_PERMISSIONS = {
  OPS_READ: 'ops.read',
  OPS_RECONCILE: 'ops.reconcile',
  OPS_CALLBACKS_REPLAY: 'ops.callbacks.replay',
  CATALOG_REMATCH: 'catalog.rematch',
  USER_MANAGE: 'user.manage',
} as const;

export type AppPermission = (typeof APP_PERMISSIONS)[keyof typeof APP_PERMISSIONS];
