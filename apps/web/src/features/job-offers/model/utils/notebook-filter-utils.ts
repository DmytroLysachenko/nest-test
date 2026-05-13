import type { ListJobOffersParams } from '@/features/job-offers/api/job-offers-api';
import type {
  DiscoveryQuickActionKey,
  NotebookActiveFilter,
  NotebookActionPlanBucketKey,
  NotebookFilterSetter,
  NotebookQuickActionKey,
} from '@/features/job-offers/model/types/notebook-view-model';
import type { NotebookFiltersDto } from '@/shared/types/api';

const attentionFilterLabels: Record<Exclude<NotebookFiltersDto['attention'], 'all'>, string> = {
  staleUntriaged: 'Attention: stale untriaged',
  missingNextStep: 'Attention: missing next step',
  stalePipeline: 'Attention: stale pipeline',
  followUpOverdue: 'Attention: follow-up overdue',
  followUpDueToday: 'Attention: due today',
  prepRecommended: 'Attention: prep recommended',
  awaitingDecision: 'Attention: awaiting decision',
  degradedResults: 'Attention: degraded results',
};

const baseQuickActionFilters: Pick<NotebookFiltersDto, 'status' | 'mode' | 'hasScore' | 'followUp' | 'attention'> = {
  status: 'ALL',
  mode: 'approx',
  hasScore: 'all',
  followUp: 'all',
  attention: 'all',
};

export const notebookQuickActionFilters: Record<
  NotebookQuickActionKey,
  Pick<NotebookFiltersDto, 'status' | 'mode' | 'hasScore' | 'followUp' | 'attention'>
> = {
  unscored: { ...baseQuickActionFilters, hasScore: 'no' },
  strictTop: { ...baseQuickActionFilters, hasScore: 'yes' },
  saved: { ...baseQuickActionFilters, status: 'SAVED' },
  applied: { ...baseQuickActionFilters, status: 'APPLIED' },
  followUpDue: { ...baseQuickActionFilters, followUp: 'due' },
  followUpUpcoming: { ...baseQuickActionFilters, followUp: 'upcoming' },
  staleUntriaged: { ...baseQuickActionFilters, attention: 'staleUntriaged' },
  missingNextStep: { ...baseQuickActionFilters, attention: 'missingNextStep' },
  stalePipeline: { ...baseQuickActionFilters, attention: 'stalePipeline' },
  followUpDueToday: { ...baseQuickActionFilters, attention: 'followUpDueToday' },
  prepRecommended: { ...baseQuickActionFilters, attention: 'prepRecommended' },
  awaitingDecision: { ...baseQuickActionFilters, attention: 'awaitingDecision' },
  degradedResults: { ...baseQuickActionFilters, attention: 'degradedResults' },
};

export const notebookActionPlanQuickActions: Partial<Record<NotebookActionPlanBucketKey, NotebookQuickActionKey>> = {
  'due-now': 'followUpDue',
  'due-today': 'followUpDueToday',
  'scheduled-soon': 'followUpUpcoming',
  'missing-next-step': 'missingNextStep',
  'stale-active': 'stalePipeline',
  'strict-top-unreviewed': 'strictTop',
  'prep-recommended': 'prepRecommended',
  'awaiting-decision': 'awaitingDecision',
  'degraded-results': 'degradedResults',
};

const notebookQuickActionKeys = Object.keys(notebookQuickActionFilters) as NotebookQuickActionKey[];
const discoveryQuickActionKeys: DiscoveryQuickActionKey[] = ['unscored', 'strictTop', 'staleUntriaged'];

export const isNotebookQuickActionKey = (value: string | null): value is NotebookQuickActionKey =>
  typeof value === 'string' && notebookQuickActionKeys.includes(value as NotebookQuickActionKey);

export const isDiscoveryQuickActionKey = (value: string | null): value is DiscoveryQuickActionKey =>
  typeof value === 'string' && discoveryQuickActionKeys.includes(value as DiscoveryQuickActionKey);

export const toNotebookListParams = (
  filters: NotebookFiltersDto,
  pagination: { limit: number; offset: number },
): ListJobOffersParams => ({
  limit: pagination.limit,
  offset: pagination.offset,
  status: filters.status === 'ALL' ? undefined : filters.status,
  mode: filters.mode,
  search: filters.search || undefined,
  tag: filters.tag || undefined,
  hasScore: filters.hasScore === 'all' ? undefined : filters.hasScore === 'yes',
  followUp: filters.followUp === 'all' ? undefined : filters.followUp,
  attention: filters.attention === 'all' ? undefined : filters.attention,
});

export const buildNotebookActiveFilters = (
  filters: NotebookFiltersDto,
  setNotebookFilter: NotebookFilterSetter,
): NotebookActiveFilter[] => {
  const activeFilters: NotebookActiveFilter[] = [];

  if (filters.status !== 'ALL') {
    activeFilters.push({
      key: 'status',
      label: `Status: ${filters.status}`,
      onClear: () => setNotebookFilter('status', 'ALL'),
    });
  }
  if (filters.mode !== 'approx') {
    activeFilters.push({
      key: 'mode',
      label: `Mode: ${filters.mode}`,
      onClear: () => setNotebookFilter('mode', 'approx'),
    });
  }
  if (filters.hasScore !== 'all') {
    activeFilters.push({
      key: 'hasScore',
      label: `Has score: ${filters.hasScore}`,
      onClear: () => setNotebookFilter('hasScore', 'all'),
    });
  }
  if (filters.tag) {
    activeFilters.push({
      key: 'tag',
      label: `Tag: ${filters.tag}`,
      onClear: () => setNotebookFilter('tag', ''),
    });
  }
  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${filters.search}`,
      onClear: () => setNotebookFilter('search', ''),
    });
  }
  if (filters.followUp !== 'all') {
    activeFilters.push({
      key: 'followUp',
      label: `Follow-up: ${filters.followUp}`,
      onClear: () => setNotebookFilter('followUp', 'all'),
    });
  }
  if (filters.attention !== 'all') {
    activeFilters.push({
      key: 'attention',
      label: attentionFilterLabels[filters.attention],
      onClear: () => setNotebookFilter('attention', 'all'),
    });
  }

  return activeFilters;
};
