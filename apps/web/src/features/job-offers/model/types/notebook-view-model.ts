import type { ListJobOffersParams } from '@/features/job-offers/api/job-offers-api';
import type { NotebookFiltersDto } from '@/shared/types/api';

export type NotebookQuickActionKey =
  | 'unscored'
  | 'strictTop'
  | 'saved'
  | 'applied'
  | 'staleUntriaged'
  | 'followUpDue'
  | 'followUpUpcoming'
  | 'missingNextStep'
  | 'stalePipeline'
  | 'followUpDueToday'
  | 'prepRecommended'
  | 'awaitingDecision'
  | 'degradedResults';

export type DiscoveryQuickActionKey = Extract<NotebookQuickActionKey, 'unscored' | 'strictTop' | 'staleUntriaged'>;

export type NotebookMode = NonNullable<ListJobOffersParams['mode']>;
export type NotebookAttentionFilter = NonNullable<ListJobOffersParams['attention']>;

export type NotebookFilterSetter = <K extends keyof NotebookFiltersDto>(key: K, value: NotebookFiltersDto[K]) => void;

export type NotebookActiveFilter = {
  key: string;
  label: string;
  onClear: () => void;
};
