import { describe, expect, it, vi } from 'vitest';

import {
  buildNotebookActiveFilters,
  isDiscoveryQuickActionKey,
  isNotebookQuickActionKey,
  notebookQuickActionFilters,
  toNotebookListParams,
} from '@/features/job-offers/model/utils/notebook-filter-utils';

import type { NotebookFiltersDto } from '@/shared/types/api';

const baseFilters: NotebookFiltersDto = {
  status: 'ALL',
  mode: 'strict',
  view: 'LIST',
  search: '',
  tag: '',
  hasScore: 'all',
  followUp: 'all',
  attention: 'all',
};

describe('notebook filter utilities', () => {
  it('maps notebook filters into list query params without transport noise', () => {
    expect(
      toNotebookListParams(
        {
          ...baseFilters,
          status: 'SAVED',
          search: 'react',
          hasScore: 'yes',
          followUp: 'due',
          attention: 'degradedResults',
        },
        { limit: 20, offset: 40 },
      ),
    ).toEqual({
      limit: 20,
      offset: 40,
      status: 'SAVED',
      mode: 'strict',
      search: 'react',
      tag: undefined,
      hasScore: true,
      followUp: 'due',
      attention: 'degradedResults',
    });
  });

  it('keeps quick-action filters deterministic and server-compatible', () => {
    expect(notebookQuickActionFilters.followUpDue).toEqual(
      expect.objectContaining({ status: 'ALL', mode: 'strict', followUp: 'due', attention: 'all' }),
    );
    expect(notebookQuickActionFilters.degradedResults).toEqual(
      expect.objectContaining({ status: 'ALL', mode: 'strict', attention: 'degradedResults' }),
    );
    expect(notebookQuickActionFilters.applied).toEqual(
      expect.objectContaining({ status: 'APPLIED', mode: 'strict', hasScore: 'all' }),
    );
  });

  it('narrows route focus params to supported quick actions', () => {
    expect(isNotebookQuickActionKey('followUpDueToday')).toBe(true);
    expect(isNotebookQuickActionKey('unknown')).toBe(false);
    expect(isNotebookQuickActionKey(null)).toBe(false);

    expect(isDiscoveryQuickActionKey('strictTop')).toBe(true);
    expect(isDiscoveryQuickActionKey('followUpDueToday')).toBe(false);
  });

  it('builds active filter labels with typed clear handlers', () => {
    const setNotebookFilter = vi.fn();
    const activeFilters = buildNotebookActiveFilters(
      {
        ...baseFilters,
        tag: 'frontend',
        attention: 'missingNextStep',
      },
      setNotebookFilter,
    );

    expect(activeFilters.map((filter) => filter.label)).toEqual(['Tag: frontend', 'Attention: missing next step']);

    activeFilters[1]?.onClear();

    expect(setNotebookFilter).toHaveBeenCalledWith('attention', 'all');
  });
});
