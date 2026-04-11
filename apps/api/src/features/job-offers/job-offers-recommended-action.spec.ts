import { buildRecommendedAction } from './job-offers-recommended-action';

describe('buildRecommendedAction', () => {
  const now = new Date('2026-04-11T10:00:00.000Z');

  it('prioritizes overdue follow-ups', () => {
    expect(
      buildRecommendedAction(
        {
          id: 'offer-1',
          status: 'SAVED',
          followUpAt: '2026-04-10T10:00:00.000Z',
          nextStep: 'Email recruiter',
          lastStatusAt: '2026-04-10T10:00:00.000Z',
        },
        now,
      ),
    ).toEqual(
      expect.objectContaining({
        key: 'complete-overdue-follow-up',
        label: 'Complete overdue follow-up',
        reason: 'Next step: Email recruiter.',
        href: '/notebook?selected=offer-1',
      }),
    );
  });

  it('asks active offers to set a missing next step before lower-priority prep', () => {
    expect(
      buildRecommendedAction(
        {
          id: 'offer-2',
          status: 'APPLIED',
          lastStatusAt: '2026-04-11T08:00:00.000Z',
        },
        now,
      ),
    ).toEqual(expect.objectContaining({ key: 'set-next-step', label: 'Set next step' }));
  });

  it('falls back to deterministic triage for new offers without workflow pressure', () => {
    expect(
      buildRecommendedAction(
        {
          id: 'offer-3',
          status: 'NEW',
          lastStatusAt: '2026-04-11T08:00:00.000Z',
        },
        now,
      ),
    ).toEqual(expect.objectContaining({ key: 'triage-offer', label: 'Triage offer' }));
  });
});
