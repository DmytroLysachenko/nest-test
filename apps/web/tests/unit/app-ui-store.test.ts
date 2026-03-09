import { useAppUiStore } from '@/shared/store/app-ui-store';

describe('useAppUiStore', () => {
  beforeEach(() => {
    useAppUiStore.setState({
      dashboard: { lastVisitedSection: 'workflow' },
      notebook: {
        selectedOfferId: null,
        selectedOfferIds: [],
        filters: {
          status: 'ALL',
          mode: 'strict',
          view: 'LIST',
          search: '',
          tag: '',
          hasScore: 'all',
          followUp: 'all',
        },
        savedPreset: null,
        lastInteractionAt: null,
        hydratedFromServer: false,
        pagination: {
          offset: 0,
          limit: 20,
        },
      },
    });
  });

  it('updates notebook filter and resets offset', () => {
    useAppUiStore.getState().setNotebookOffset(40);
    useAppUiStore.getState().setNotebookFilter('search', 'react');

    const state = useAppUiStore.getState();
    expect(state.notebook.filters.search).toBe('react');
    expect(state.notebook.pagination.offset).toBe(0);
  });

  it('sets selected offer id', () => {
    useAppUiStore.getState().setNotebookSelectedOffer('offer-1');

    expect(useAppUiStore.getState().notebook.selectedOfferId).toBe('offer-1');
    expect(useAppUiStore.getState().notebook.selectedOfferIds).toEqual(['offer-1']);
  });

  it('resets filters', () => {
    useAppUiStore.getState().setNotebookFilter('status', 'SAVED');
    useAppUiStore.getState().setNotebookFilter('tag', 'frontend');
    useAppUiStore.getState().resetNotebookFilters();

    const filters = useAppUiStore.getState().notebook.filters;
    expect(filters.status).toBe('ALL');
    expect(filters.tag).toBe('');
    expect(filters.search).toBe('');
    expect(filters.hasScore).toBe('all');
    expect(filters.followUp).toBe('all');
    expect(filters.mode).toBe('strict');
  });

  it('saves and applies notebook filter preset', () => {
    useAppUiStore.getState().setNotebookFilter('status', 'SAVED');
    useAppUiStore.getState().setNotebookFilter('search', 'react');
    useAppUiStore.getState().saveNotebookFilterPreset();

    useAppUiStore.getState().setNotebookFilter('status', 'DISMISSED');
    useAppUiStore.getState().setNotebookFilter('search', 'node');
    useAppUiStore.getState().applyNotebookFilterPreset();

    const filters = useAppUiStore.getState().notebook.filters;
    expect(filters.status).toBe('SAVED');
    expect(filters.search).toBe('react');
  });

  it('toggles selected offer ids', () => {
    useAppUiStore.getState().toggleNotebookSelectedOfferId('offer-1');
    useAppUiStore.getState().toggleNotebookSelectedOfferId('offer-2');
    useAppUiStore.getState().toggleNotebookSelectedOfferId('offer-1');

    expect(useAppUiStore.getState().notebook.selectedOfferIds).toEqual(['offer-2']);
  });
});
