export const getHumanFitHighlights = (
  matchMeta: Record<string, unknown> | null,
  explanationTags: string[],
  matchScore: number | null,
) => {
  const highlights: string[] = [];
  const llmSummary = typeof matchMeta?.llmSummary === 'string' ? matchMeta.llmSummary.trim() : '';
  if (llmSummary) {
    highlights.push(llmSummary);
  }

  const violations = Array.isArray(matchMeta?.hardConstraintViolations)
    ? matchMeta.hardConstraintViolations.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    : [];

  if (typeof matchScore === 'number') {
    highlights.push(
      matchScore >= 75 ? 'Strong overall fit' : matchScore >= 60 ? 'Promising fit' : 'Needs a closer look',
    );
  }

  if (explanationTags.includes('skill_strong')) {
    highlights.push('Strong skills overlap');
  } else if (explanationTags.includes('skill_partial')) {
    highlights.push('Partial skills overlap');
  }

  if (violations.some((item) => item.toLowerCase().includes('seniority'))) {
    highlights.push('Possible seniority mismatch');
  }

  if (violations.some((item) => item.toLowerCase().includes('employment'))) {
    highlights.push('Contract preference gap');
  }

  return Array.from(new Set(highlights)).slice(0, 4);
};

export const buildHumanFitSummary = (
  matchMeta: Record<string, unknown> | null,
  explanationTags: string[],
  matchScore: number | null,
) => {
  const llmSummary = typeof matchMeta?.llmSummary === 'string' ? matchMeta.llmSummary.trim() : '';
  if (llmSummary) {
    return llmSummary;
  }

  if (typeof matchScore !== 'number') {
    return 'This role still needs a fuller fit review.';
  }

  if (explanationTags.includes('hard_constraints_failed')) {
    return matchScore >= 70
      ? 'The role looks attractive, but one or more hard preferences may not line up.'
      : 'Some fit is visible, but the role breaks one or more hard preferences.';
  }

  if (matchScore >= 75) {
    return 'This role looks like a strong match for your current profile.';
  }

  if (matchScore >= 60) {
    return 'This role looks promising and is worth a quick first-pass review.';
  }

  return 'This role may still be worth checking, but the fit signal is weaker.';
};
