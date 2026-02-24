'use client';

import { create } from 'zustand';

type AppUiState = {
  dashboard: {
    lastVisitedSection: 'workflow' | 'profile' | 'notebook' | 'scraping';
  };
  notebook: {
    selectedOfferId: string | null;
    filters: {
      status: 'ALL' | 'NEW' | 'SEEN' | 'SAVED' | 'APPLIED' | 'DISMISSED';
      mode: 'strict' | 'approx' | 'explore';
      search: string;
      tag: string;
      hasScore: 'all' | 'yes' | 'no';
    };
    pagination: {
      offset: number;
      limit: number;
    };
  };
};

type AppUiActions = {
  setLastVisitedSection: (section: AppUiState['dashboard']['lastVisitedSection']) => void;
  setNotebookSelectedOffer: (offerId: string | null) => void;
  setNotebookFilter: <K extends keyof AppUiState['notebook']['filters']>(
    key: K,
    value: AppUiState['notebook']['filters'][K],
  ) => void;
  resetNotebookFilters: () => void;
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
    filters: initialNotebookFilters,
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
      notebook: { ...state.notebook, selectedOfferId: offerId },
    })),
  setNotebookFilter: (key, value) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        filters: { ...state.notebook.filters, [key]: value },
        pagination: { ...state.notebook.pagination, offset: 0 },
      },
    })),
  resetNotebookFilters: () =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        filters: initialNotebookFilters,
        pagination: { ...state.notebook.pagination, offset: 0 },
      },
    })),
  setNotebookOffset: (offset) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        pagination: { ...state.notebook.pagination, offset: Math.max(0, offset) },
      },
    })),
}));
