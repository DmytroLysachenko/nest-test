import { queryKeys } from '@/shared/lib/query/query-keys';

describe('queryKeys', () => {
  it('builds stable auth and profile keys', () => {
    expect(queryKeys.auth.me('token-1')).toEqual(['auth', 'me', 'token-1']);
    expect(queryKeys.profileInputs.latest('token-1')).toEqual(['profile-inputs', 'latest', 'token-1']);
  });

  it('builds job offers key with params object', () => {
    const params = { limit: 20, offset: 0, status: 'SAVED' };

    expect(queryKeys.jobOffers.list('token-2', params)).toEqual(['job-offers', 'token-2', params]);
  });
});
