'use client';

import { useEffect, useState } from 'react';

import { toNormalizedCsvValues } from '@/shared/lib/utils/input-normalizers';

import type { JobOfferListItemDto } from '@/shared/types/api';

type UseNotebookOfferDetailsDraftsArgs = {
  offer: JobOfferListItemDto | null;
};

export const useNotebookOfferDetailsDrafts = ({ offer }: UseNotebookOfferDetailsDraftsArgs) => {
  const [notesDraft, setNotesDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');

  useEffect(() => {
    setNotesDraft(offer?.notes ?? '');
    setTagsDraft(offer?.tags?.join(', ') ?? '');
  }, [offer?.id, offer?.notes, offer?.tags]);

  const normalizedTags = toNormalizedCsvValues(tagsDraft);

  return {
    notesDraft,
    setNotesDraft,
    tagsDraft,
    setTagsDraft,
    normalizedTags,
  };
};
