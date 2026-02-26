import type { CandidateProfile } from '@/features/career-profiles/schema/candidate-profile.schema';

type JobContext = {
  text: string;
  title?: string | null;
  location?: string | null;
  employmentType?: string | null;
  salaryText?: string | null;
};

const SENIORITY_ORDER: Record<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager', number> = {
  intern: 1,
  junior: 2,
  mid: 3,
  senior: 4,
  lead: 5,
  manager: 6,
};

const detectJobSeniority = (text: string) => {
  const input = text.toLowerCase();
  if (/(intern|trainee|praktykant|stażyst|staż)/i.test(input)) {
    return 'intern' as const;
  }
  if (/(junior|młodszy)/i.test(input)) {
    return 'junior' as const;
  }
  if (/(mid|regular|specjalista)/i.test(input)) {
    return 'mid' as const;
  }
  if (/(senior|starszy)/i.test(input)) {
    return 'senior' as const;
  }
  if (/(lead|tech lead|principal)/i.test(input)) {
    return 'lead' as const;
  }
  if (/(manager|menedżer|kierownik|head of)/i.test(input)) {
    return 'manager' as const;
  }
  return null;
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/g)
    .map((token) => token.replace(/^\.+|\.+$/g, ''))
    .filter((token) => token.length > 1);

const asTokenSet = (value: string) => new Set(tokenize(value));

const intersects = (source: Set<string>, values: string[]) => values.some((value) => source.has(value));

const normalizeScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const parseAmountCandidates = (value: string) =>
  [...value.matchAll(/\d{2,3}(?:[ .]?\d{3})?/g)]
    .map((match) => Number(match[0].replace(/[ .]/g, '')))
    .filter((num) => Number.isFinite(num) && num > 0);

const confidenceWeight = (score: number) => Math.max(0.2, Math.min(1, score));

export const scoreCandidateAgainstJob = (profile: CandidateProfile, context: JobContext) => {
  const text = [context.title, context.text, context.location, context.employmentType, context.salaryText]
    .filter(Boolean)
    .join(' ');
  const jobTokens = asTokenSet(text);
  const hardViolations: string[] = [];
  const softGaps: string[] = [];
  const matchedCompetencies: Array<{ name: string; confidenceScore: number; importance: string }> = [];
  const primarySeniority = profile.candidateCore.seniority.primary;
  const maxAllowedSeniorityOrder = primarySeniority ? SENIORITY_ORDER[primarySeniority] : null;
  const detectedJobSeniority = detectJobSeniority(text);

  if (maxAllowedSeniorityOrder && detectedJobSeniority) {
    const jobOrder = SENIORITY_ORDER[detectedJobSeniority];
    if (jobOrder > maxAllowedSeniorityOrder) {
      hardViolations.push('seniority');
    }
  }

  const competencyTotalWeight = profile.competencies.reduce((acc, item) => {
    const importanceMultiplier = item.importance === 'high' ? 1.5 : item.importance === 'medium' ? 1 : 0.7;
    return acc + confidenceWeight(item.confidenceScore) * importanceMultiplier;
  }, 0);

  const competencyMatchedWeight = profile.competencies.reduce((acc, item) => {
    const itemTokens = tokenize(item.name);
    const isMatch = intersects(jobTokens, itemTokens);
    if (!isMatch) {
      return acc;
    }
    const importanceMultiplier = item.importance === 'high' ? 1.5 : item.importance === 'medium' ? 1 : 0.7;
    const weight = confidenceWeight(item.confidenceScore) * importanceMultiplier;
    matchedCompetencies.push({
      name: item.name,
      confidenceScore: item.confidenceScore,
      importance: item.importance,
    });
    return acc + weight;
  }, 0);

  const roleTokens = profile.targetRoles.flatMap((role) => tokenize(role.title));
  const roleMatches = roleTokens.filter((token) => jobTokens.has(token));
  const roleScore = roleTokens.length ? (roleMatches.length / roleTokens.length) * 20 : 0;

  const keywordTokens = profile.searchSignals.keywords.flatMap((item) => tokenize(item.value));
  const keywordMatches = keywordTokens.filter((token) => jobTokens.has(token));
  const keywordScore = keywordTokens.length ? (keywordMatches.length / keywordTokens.length) * 10 : 0;

  const hardWorkModes = profile.workPreferences.hardConstraints.workModes;
  if (hardWorkModes.length) {
    const modes = hardWorkModes.filter((mode) => {
      const aliases =
        mode === 'remote' ? ['remote', 'zdal', 'home'] : mode === 'hybrid' ? ['hybrid', 'hybryd'] : [mode];
      return aliases.some((alias) => text.toLowerCase().includes(alias));
    });
    if (!modes.length) {
      hardViolations.push('workModes');
    }
  }

  const hardEmploymentTypes = profile.workPreferences.hardConstraints.employmentTypes;
  if (hardEmploymentTypes.length) {
    const types = hardEmploymentTypes.filter((type) => text.toLowerCase().includes(type.toLowerCase()));
    if (!types.length) {
      hardViolations.push('employmentTypes');
    }
  }

  if (profile.workPreferences.hardConstraints.minSalary) {
    const expectedMin = profile.workPreferences.hardConstraints.minSalary.amount;
    const discovered = parseAmountCandidates(text);
    if (!discovered.length || Math.max(...discovered) < expectedMin) {
      hardViolations.push('minSalary');
    }
  }

  const softWorkModeScore = profile.workPreferences.softPreferences.workModes.reduce((acc, item) => {
    const aliases =
      item.value === 'remote'
        ? ['remote', 'zdal', 'home']
        : item.value === 'hybrid'
          ? ['hybrid', 'hybryd']
          : [item.value];
    const matched = aliases.some((alias) => text.toLowerCase().includes(alias));
    if (!matched) {
      softGaps.push(`workMode:${item.value}`);
      return acc;
    }
    return acc + item.weight * 10;
  }, 0);

  const softEmploymentTypeScore = profile.workPreferences.softPreferences.employmentTypes.reduce((acc, item) => {
    const matched = text.toLowerCase().includes(item.value.toLowerCase());
    if (!matched) {
      softGaps.push(`employmentType:${item.value}`);
      return acc;
    }
    return acc + item.weight * 6;
  }, 0);

  const softSalaryScore = profile.workPreferences.softPreferences.salary
    ? (() => {
        const expected = profile.workPreferences.softPreferences.salary.value.amount;
        const values = parseAmountCandidates(text);
        if (!values.length || Math.max(...values) < expected) {
          softGaps.push('salary');
          return 0;
        }
        return profile.workPreferences.softPreferences.salary.weight * 6;
      })()
    : 0;

  const competencyScore = competencyTotalWeight > 0 ? (competencyMatchedWeight / competencyTotalWeight) * 48 : 0;

  const breakdown = {
    competencyFit: Math.round(competencyScore),
    roleFit: Math.round(roleScore),
    keywordFit: Math.round(keywordScore),
    softWorkModes: Math.round(softWorkModeScore),
    softEmploymentTypes: Math.round(softEmploymentTypeScore),
    softSalary: Math.round(softSalaryScore),
  };

  const rawScore = Object.values(breakdown).reduce((acc, value) => acc + value, 0);
  const blockedByHardConstraints = hardViolations.length > 0;
  const score = blockedByHardConstraints ? Math.min(40, normalizeScore(rawScore)) : normalizeScore(rawScore);

  return {
    score,
    breakdown,
    hardConstraintViolations: Array.from(new Set(hardViolations)),
    softPreferenceGaps: Array.from(new Set(softGaps)),
    matchedCompetencies,
    blockedByHardConstraints,
  };
};
