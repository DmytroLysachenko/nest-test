import { renderHook } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/shared/lib/query/query-keys';
import { useDataSync } from '@/shared/lib/query/use-data-sync';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: vi.fn(),
  };
});

const mockedUseQueryClient = vi.mocked(useQueryClient);

describe('useDataSync', () => {
  it('invalidates workflow-critical job-offer read models after a broad workflow mutation', () => {
    const invalidateQueries = vi.fn();
    const setQueryData = vi.fn();

    mockedUseQueryClient.mockReturnValue({
      invalidateQueries,
      setQueryData,
    } as unknown as ReturnType<typeof useQueryClient>);

    const { result } = renderHook(() => useDataSync('token-1'));
    result.current.syncJobOffers();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['job-offers', 'token-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['job-offers', 'discovery', 'token-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.summary('token-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.discoverySummary('token-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.focus('token-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.actionPlan('token-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.reminderPreview('token-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.workflow.summary('token-1'),
    });
  });

  it('supports narrow job-offer invalidation for single-offer workflow actions', () => {
    const invalidateQueries = vi.fn();
    const setQueryData = vi.fn();

    mockedUseQueryClient.mockReturnValue({
      invalidateQueries,
      setQueryData,
    } as unknown as ReturnType<typeof useQueryClient>);

    const { result } = renderHook(() => useDataSync('token-3'));
    result.current.syncJobOffers({
      collections: false,
      historyOfferId: 'offer-1',
      prepOfferId: 'offer-1',
      notebookSummary: false,
      discoverySummary: false,
      focus: false,
      actionPlan: false,
      reminderPreview: false,
      workspace: false,
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.history('token-3', 'offer-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.prepPacket('token-3', 'offer-1'),
      exact: true,
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.workflow.summary('token-3'),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.jobOffers.summary('token-3'),
      exact: true,
    });
  });

  it('sets latest profile input optimistically before syncing workspace summary', () => {
    const invalidateQueries = vi.fn();
    const setQueryData = vi.fn();

    mockedUseQueryClient.mockReturnValue({
      invalidateQueries,
      setQueryData,
    } as unknown as ReturnType<typeof useQueryClient>);

    const { result } = renderHook(() => useDataSync('token-2'));
    result.current.syncProfileInputs({
      id: 'profile-input-1',
      userId: 'user-1',
      targetRoles: 'Frontend Developer',
      notes: 'Remote first',
      intakePayload: null,
      createdAt: '2026-05-03T10:00:00.000Z',
    });

    expect(setQueryData).toHaveBeenCalledWith(queryKeys.profileInputs.latest('token-2'), {
      id: 'profile-input-1',
      userId: 'user-1',
      targetRoles: 'Frontend Developer',
      notes: 'Remote first',
      intakePayload: null,
      createdAt: '2026-05-03T10:00:00.000Z',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.workflow.summary('token-2'),
    });
  });
});
