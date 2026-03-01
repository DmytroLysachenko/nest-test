type JobOfferRow = {
  matchScore: number | null;
  matchMeta: Record<string, unknown> | null;
};

export type NotebookRankingMode = 'strict' | 'approx' | 'explore';

export type NotebookRankingTuning = {
  approxViolationPenalty: number;
  approxMaxViolationPenalty: number;
  approxScoredBonus: number;
  exploreUnscoredBase: number;
  exploreRecencyWeight: number;
};

type RankingResult = {
  include: boolean;
  rankingScore: number;
  explanationTags: string[];
};

const defaultTuning: NotebookRankingTuning = {
  approxViolationPenalty: 10,
  approxMaxViolationPenalty: 30,
  approxScoredBonus: 10,
  exploreUnscoredBase: 0,
  exploreRecencyWeight: 5,
};

const getHardConstraintViolations = (matchMeta: Record<string, unknown> | null) => {
  const raw = matchMeta?.hardConstraintViolations;
  if (!Array.isArray(raw)) {
    return [] as string[];
  }
  return raw.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
};

const hasHardConstraintsPass = (violations: string[]) => violations.length === 0;

const deriveSkillTag = (matchMeta: Record<string, unknown> | null) => {
  const breakdown = matchMeta?.breakdown as Record<string, unknown> | undefined;
  const skills = typeof breakdown?.competencyFit === 'number' ? breakdown.competencyFit : null;
  if (skills === null) {
    return null;
  }
  return skills >= 25 ? 'skill_strong' : 'skill_partial';
};

export const computeNotebookOfferRanking = (
  offer: JobOfferRow,
  mode: NotebookRankingMode,
  tuning: Partial<NotebookRankingTuning> = {},
): RankingResult => {
  const resolvedTuning: NotebookRankingTuning = {
    ...defaultTuning,
    ...tuning,
  };
  const hasScore = typeof offer.matchScore === 'number';
  const score = offer.matchScore ?? 0;
  const violations = getHardConstraintViolations(offer.matchMeta);
  const noHardViolations = hasHardConstraintsPass(violations);
  const skillTag = deriveSkillTag(offer.matchMeta);
  const explanationTags = [
    hasScore ? 'scored' : 'unscored',
    noHardViolations ? 'hard_constraints_ok' : 'hard_constraints_failed',
    violations.some((item) => item.toLowerCase().includes('seniority')) ? 'seniority_mismatch' : 'seniority_match',
    violations.some((item) => item.toLowerCase().includes('employment')) ? 'contract_gap' : 'contract_close',
    skillTag,
  ].filter((item): item is string => Boolean(item));

  if (mode === 'strict') {
    if (!hasScore || !noHardViolations) {
      return { include: false, rankingScore: -1, explanationTags };
    }
    return { include: true, rankingScore: score, explanationTags };
  }

  if (mode === 'approx') {
    const penalty = Math.min(
      violations.length * resolvedTuning.approxViolationPenalty,
      resolvedTuning.approxMaxViolationPenalty,
    );
    const rankingScore = Math.max(0, score - penalty + (hasScore ? resolvedTuning.approxScoredBonus : 0));
    return { include: true, rankingScore, explanationTags };
  }

  return {
    include: true,
    rankingScore: hasScore ? score : resolvedTuning.exploreUnscoredBase,
    explanationTags,
  };
};
