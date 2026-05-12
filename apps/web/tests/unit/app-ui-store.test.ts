import { useAppUiStore } from '@/shared/store/app-ui-store';

describe('useAppUiStore', () => {
  beforeEach(() => {
    useAppUiStore.setState({
      notebook: {
        filters: {
          status: 'ALL',
          mode: 'approx',
          view: 'LIST',
          search: '',
          tag: '',
          hasScore: 'all',
          followUp: 'all',
          attention: 'all',
        },
        savedPreset: null,
        hydratedFromServer: false,
      },
    });
  });

  it('updates notebook filter without mutating durable preset state', () => {
    useAppUiStore.getState().setNotebookFilter('search', 'react');

    const state = useAppUiStore.getState();
    expect(state.notebook.filters.search).toBe('react');
    expect(state.notebook.savedPreset).toBeNull();
    expect(state.notebook.hydratedFromServer).toBe(false);
  });

  it('hydrates notebook preferences from the server payload', () => {
    useAppUiStore.getState().hydrateNotebookPreferences(
      {
        status: 'SAVED',
        mode: 'approx',
        view: 'LIST',
        search: 'react',
        tag: 'frontend',
        hasScore: 'yes',
        followUp: 'due',
        attention: 'all',
      },
      {
        status: 'APPLIED',
        mode: 'approx',
        view: 'LIST',
        search: 'node',
        tag: '',
        hasScore: 'all',
        followUp: 'all',
        attention: 'stalePipeline',
      },
    );

    const state = useAppUiStore.getState().notebook;
    expect(state.filters.search).toBe('react');
    expect(state.filters.followUp).toBe('due');
    expect(state.savedPreset?.status).toBe('APPLIED');
    expect(state.hydratedFromServer).toBe(true);
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
    expect(filters.attention).toBe('all');
    expect(filters.mode).toBe('approx');
    expect(useAppUiStore.getState().notebook.hydratedFromServer).toBe(true);
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
    expect(useAppUiStore.getState().notebook.savedPreset?.search).toBe('react');
  });

  it('does not apply a preset when no saved preset exists', () => {
    useAppUiStore.getState().setNotebookFilter('status', 'INTERVIEWING');
    useAppUiStore.getState().applyNotebookFilterPreset();

    expect(useAppUiStore.getState().notebook.filters.status).toBe('INTERVIEWING');
    expect(useAppUiStore.getState().notebook.savedPreset).toBeNull();
  });
});
