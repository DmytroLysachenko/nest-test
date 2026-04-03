export const defaultNotebookFilters = {
  status: 'ALL',
  mode: 'strict',
  view: 'LIST',
  search: '',
  tag: '',
  hasScore: 'all',
  followUp: 'all',
  attention: 'all',
} as const;

export const normalizeNotebookFilters = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultNotebookFilters };
  }

  return {
    ...defaultNotebookFilters,
    ...(value as Record<string, unknown>),
  };
};
