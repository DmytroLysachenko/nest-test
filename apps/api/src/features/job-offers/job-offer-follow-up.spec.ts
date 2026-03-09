import { parseFollowUpAt, resolveFollowUpState } from './job-offer-follow-up';

describe('job-offer-follow-up', () => {
  const now = new Date('2026-03-09T10:00:00.000Z');

  it('returns none when follow-up is absent', () => {
    expect(resolveFollowUpState('SAVED', {}, now)).toBe('none');
  });

  it('returns due when follow-up time is in the past', () => {
    expect(resolveFollowUpState('APPLIED', { followUpAt: '2026-03-08T09:00:00.000Z' }, now)).toBe('due');
  });

  it('returns upcoming when follow-up time is in the future', () => {
    expect(resolveFollowUpState('INTERVIEWING', { followUpAt: '2026-03-10T09:00:00.000Z' }, now)).toBe('upcoming');
  });

  it('returns none for statuses outside the tracked pipeline', () => {
    expect(resolveFollowUpState('NEW', { followUpAt: '2026-03-08T09:00:00.000Z' }, now)).toBe('none');
  });

  it('ignores invalid follow-up timestamps', () => {
    expect(parseFollowUpAt({ followUpAt: 'not-a-date' })).toBeNull();
  });
});
