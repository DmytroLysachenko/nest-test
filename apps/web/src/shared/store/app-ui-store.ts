'use client';

import { create } from 'zustand';

import type { NotebookFiltersDto } from '@/shared/types/api';

type AppUiState = {
  notebook: {
    filters: NotebookFiltersDto;
    savedPreset: NotebookFiltersDto | null;
    hydratedFromServer: boolean;
  };
};

type AppUiActions = {
  setNotebookFilter: <K extends keyof AppUiState['notebook']['filters']>(
    key: K,
    value: AppUiState['notebook']['filters'][K],
  ) => void;
  hydrateNotebookPreferences: (filters: NotebookFiltersDto, savedPreset: NotebookFiltersDto | null) => void;
  resetNotebookFilters: () => void;
  saveNotebookFilterPreset: () => void;
  applyNotebookFilterPreset: () => void;
};

export const initialNotebookFilters: NotebookFiltersDto = {
  status: 'ALL',
  mode: 'approx',
  view: 'LIST',
  search: '',
  tag: '',
  hasScore: 'all',
  followUp: 'all',
  attention: 'all',
};

export const useAppUiStore = create<AppUiState & AppUiActions>((set) => ({
  notebook: {
    filters: initialNotebookFilters,
    savedPreset: null,
    hydratedFromServer: false,
  },
  setNotebookFilter: (key, value) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        filters: { ...state.notebook.filters, [key]: value },
      },
    })),
  hydrateNotebookPreferences: (filters, savedPreset) =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        filters,
        savedPreset,
        hydratedFromServer: true,
      },
    })),
  resetNotebookFilters: () =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        filters: initialNotebookFilters,
        hydratedFromServer: true,
      },
    })),
  saveNotebookFilterPreset: () =>
    set((state) => ({
      ...state,
      notebook: {
        ...state.notebook,
        savedPreset: { ...state.notebook.filters },
        hydratedFromServer: true,
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
        },
      };
    }),
}));
