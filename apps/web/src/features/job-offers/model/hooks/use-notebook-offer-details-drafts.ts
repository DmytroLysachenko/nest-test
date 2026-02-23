'use client';

import { useEffect, useState } from 'react';

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

  const normalizedTags = tagsDraft
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    notesDraft,
    setNotesDraft,
    tagsDraft,
    setTagsDraft,
    normalizedTags,
  };
};
