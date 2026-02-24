type JobOfferRow = {
  matchScore: number | null;
  matchMeta: Record<string, unknown> | null;
};

export type NotebookRankingMode = 'strict' | 'approx' | 'explore';

type RankingResult = {
  include: boolean;
  rankingScore: number;
  explanationTags: string[];
};

const getHardConstraintViolations = (matchMeta: Record<string, unknown> | null) => {
  const raw = matchMeta?.hardConstraintViolations;
  if (!Array.isArray(raw)) {
    return [] as string[];
  }
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const hasHardConstraintsPass = (violations: string[]) => violations.length === 0;

const deriveSkillTag = (matchMeta: Record<string, unknown> | null) => {
  const breakdown = matchMeta?.breakdown as Record<string, unknown> | undefined;
  const skills = typeof breakdown?.skills === 'number' ? breakdown.skills : null;
  if (skills === null) {
    return null;
  }
  return skills >= 25 ? 'skill_strong' : 'skill_partial';
};

export const computeNotebookOfferRanking = (offer: JobOfferRow, mode: NotebookRankingMode): RankingResult => {
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
    const penalty = violations.length * 10;
    const rankingScore = Math.max(0, score - penalty + (hasScore ? 10 : 0));
    return { include: true, rankingScore, explanationTags };
  }

  return {
    include: true,
    rankingScore: hasScore ? score : 0,
    explanationTags,
  };
};

