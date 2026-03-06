'use client';

import { create } from 'zustand';

type AppUiState = {
  dashboard: {
    lastVisitedSection: 'workflow' | 'profile' | 'notebook' | 'scraping';
  };
  notebook: {
    selectedOfferId: string | null;
    selectedOfferIds: string[];
    filters: {
      status: 'ALL' | 'NEW' | 'SEEN' | 'SAVED' | 'APPLIED' | 'DISMISSED';
      mode: 'strict' | 'approx' | 'explore';
      search: string;
      tag: string;
      hasScore: 'all' | 'yes' | 'no';
    };
    savedPreset: {
      status: 'ALL' | 'NEW' | 'SEEN' | 'SAVED' | 'APPLIED' | 'DISMISSED';
      mode: 'strict' | 'approx' | 'explore';
      search: string;
      tag: string;
      hasScore: 'all' | 'yes' | 'no';
    } | null;
    lastInteractionAt: number | null;
    pagination: {
      offset: number;
      limit: number;
    };
  };
};

type AppUiActions = {
  setLastVisitedSection: (section: AppUiState['dashboard']['lastVisitedSection']) => void;
  setNotebookSelectedOffer: (offerId: string | null) => void;
  toggleNotebookSelectedOfferId: (offerId: string) => void;
  clearNotebookSelectedOfferIds: () => void;
  setNotebookSelectedOfferIds: (ids: string[]) => void;
  setNotebookFilter: <K extends keyof AppUiState['notebook']['filters']>(
    key: K,
    value: AppUiState['notebook']['filters'][K],
  ) => void;
  resetNotebookFilters: () => void;
  saveNotebookFilterPreset: () => void;
  applyNotebookFilterPreset: () => void;
  setNotebookOffset: (offset: number) => void;
};

const initialNotebookFilters: AppUiState['notebook']['filters'] = {
  status: 'ALL',
  mode: 'strict',
  search: '',
  tag: '',
  hasScore: 'all',
};

export const useAppUiStore = create<AppUiState & AppUiActions>((set) => ({
  dashboard: {
    lastVisitedSection: 'workflow',
  },
  notebook: {
    selectedOfferId: null,
    selectedOfferIds: [],
    filters: initialNotebookFilters,
    savedPreset: null,
    lastInteractionAt: null,
    pagination: {
      offset: 0,
      limit: 20,
    },
  },
  setLastVisitedSection: (section) =>
    set((state) => ({
      ...state,
      dashboard: { ...state.dashboard, lastVisitedSection: section },
    })),
  setNotebookSelectedOffer: (offerId) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        selectedOfferId: offerId,
        selectedOfferIds: offerId ? Array.from(new Set([...state.notebook.selectedOfferIds, offerId])) : [],
      },
    })),
  toggleNotebookSelectedOfferId: (offerId) =>
    set((state) => {
      const exists = state.notebook.selectedOfferIds.includes(offerId);
      const nextIds = exists
        ? state.notebook.selectedOfferIds.filter((id) => id !== offerId)
        : [...state.notebook.selectedOfferIds, offerId];

      return {
        ...state,
        notebook: {
          ...state.notebook,
          selectedOfferIds: nextIds,
          lastInteractionAt: Date.now(),
          selectedOfferId: nextIds.length ? state.notebook.selectedOfferId : null,
        },
      };
    }),
  clearNotebookSelectedOfferIds: () =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        selectedOfferIds: [],
        selectedOfferId: null,
      },
    })),
  setNotebookSelectedOfferIds: (ids) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        selectedOfferIds: Array.from(new Set(ids)),
        lastInteractionAt: Date.now(),
      },
    })),
  setNotebookFilter: (key, value) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        filters: { ...state.notebook.filters, [key]: value },
        lastInteractionAt: Date.now(),
        pagination: { ...state.notebook.pagination, offset: 0 },
      },
    })),
  resetNotebookFilters: () =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        filters: initialNotebookFilters,
        lastInteractionAt: Date.now(),
        pagination: { ...state.notebook.pagination, offset: 0 },
      },
    })),
  saveNotebookFilterPreset: () =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        savedPreset: { ...state.notebook.filters },
      },
    })),
  applyNotebookFilterPreset: () =>
    set((state) => {
      if (!state.notebook.savedPreset) {
        return state;
      }

      return {
        ...state,
        notebook: {
          ...state.notebook,
          filters: { ...state.notebook.savedPreset },
          lastInteractionAt: Date.now(),
          pagination: { ...state.notebook.pagination, offset: 0 },
        },
      };
    }),
  setNotebookOffset: (offset) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        lastInteractionAt: Date.now(),
        pagination: { ...state.notebook.pagination, offset: Math.max(0, offset) },
      },
    })),
}));
