type NotebookCollectionStateArgs = {
  mode: 'strict' | 'approx' | 'explore';
  hiddenByModeCount: number;
  degradedResultCount: number;
  lastScrapeStatus: string | null;
};

export type NotebookCollectionState = {
  key: 'hidden' | 'degraded' | 'failed' | 'empty';
  title: string;
  description: string;
  nextStepTitle: string;
  nextStepDescription: string;
  actionLabel: string;
  nextMode: 'approx' | 'explore' | null;
};

export const getNotebookCollectionState = ({
  mode,
  hiddenByModeCount,
  degradedResultCount,
  lastScrapeStatus,
}: NotebookCollectionStateArgs): NotebookCollectionState => {
  if (mode === 'strict' && hiddenByModeCount > 0) {
    return {
      key: 'hidden',
      title: 'Strong leads exist, but strict mode is hiding them',
      description: `${hiddenByModeCount} offer${hiddenByModeCount === 1 ? '' : 's'} matched the notebook but violated one or more hard constraints. Keep strict as the default, then widen deliberately when you are ready to review near-matches.`,
      nextStepTitle: 'Open the near-match queue',
      nextStepDescription:
        'Switch to approx mode to inspect promising roles that need judgment instead of automatic rejection.',
      actionLabel: 'Switch to approx',
      nextMode: 'approx',
    };
  }

  if (degradedResultCount > 0) {
    return {
      key: 'degraded',
      title: 'Only salvageable leads are available right now',
      description: `${degradedResultCount} offer${degradedResultCount === 1 ? '' : 's'} came from incomplete source detail pages. They may still be worth checking, but treat them as lower-confidence input than fully parsed notebook rows.`,
      nextStepTitle: 'Review wider discovery carefully',
      nextStepDescription:
        mode === 'explore'
          ? 'Stay in explore mode, review the salvage-backed roles, and rerun sourcing later if this queue looks weak.'
          : 'Switch to explore mode for a broader pass, then return to strict once the notebook has healthier detail-backed rows again.',
      actionLabel: mode === 'explore' ? 'Keep reviewing in explore' : 'Switch to explore',
      nextMode: mode === 'explore' ? null : 'explore',
    };
  }

  if (lastScrapeStatus === 'FAILED') {
    return {
      key: 'failed',
      title: 'The latest sourcing run failed before it produced notebook-ready offers',
      description:
        'The notebook is empty because the last run did not finish cleanly, not because the market is definitely empty. Review planning and diagnostics before you enqueue another run.',
      nextStepTitle: 'Recover the run path first',
      nextStepDescription:
        'Open Planning to check the last run story, preflight guidance, and whether a fresh run is actually the right next action.',
      actionLabel: 'Open planning',
      nextMode: null,
    };
  }

  return {
    key: 'empty',
    title: 'No offers are in this notebook slice yet',
    description:
      'This view currently has nothing actionable. That may mean your filters are narrow, your notebook has not been refreshed recently, or the current queue simply does not contain the right leads yet.',
    nextStepTitle: 'Widen the search with intent',
    nextStepDescription:
      mode === 'explore'
        ? 'Clear status, tag, and follow-up filters first. If the queue is still empty, refresh sourcing from Planning.'
        : 'Relax filters or change mode only after you have confirmed this strict slice is truly exhausted.',
    actionLabel: mode === 'approx' ? 'Switch to explore' : 'Open planning',
    nextMode: mode === 'approx' ? 'explore' : null,
  };
};
