import type { CandidateProfile } from '@/features/career-profiles/schema/candidate-profile.schema';

type JobContext = {
  text: string;
  title?: string | null;
  location?: string | null;
  employmentType?: string | null;
  contractType?: string | null;
  contractTypes?: string[] | null;
  employmentSchedule?: string | null;
  employmentSchedules?: string[] | null;
  workModes?: string[] | null;
  jobCategory?: string | null;
  seniorityLevels?: string[] | null;
  technologies?: string[] | null;
  salaryText?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
};

const SENIORITY_ORDER: Record<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager', number> = {
  intern: 1,
  junior: 2,
  mid: 3,
  senior: 4,
  lead: 5,
  manager: 6,
};

const normalizeAscii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const detectJobSeniority = (text: string) => {
  const input = normalizeAscii(text);
  const matches: Array<keyof typeof SENIORITY_ORDER> = [];

  if (/(intern|trainee|graduate|entry[- ]level|praktykant|stazysta|staz|mlodszy specjalista)/i.test(input)) {
    matches.push('intern');
  }
  if (/(junior|associate|assistant|mlodszy)/i.test(input)) {
    matches.push('junior');
  }
  if (/(mid|regular|specialist|specjalista|samodzielny)/i.test(input)) {
    matches.push('mid');
  }
  if (/(senior|expert|starszy|staff)/i.test(input)) {
    matches.push('senior');
  }
  if (/(lead|tech lead|principal)/i.test(input)) {
    matches.push('lead');
  }
  if (/(manager|menedzer|kierownik|head of)/i.test(input)) {
    matches.push('manager');
  }

  const unique = Array.from(new Set(matches));
  if (!unique.length) {
    return { detected: null, ambiguous: false as const, matches: [] as string[] };
  }

  const detected = unique.reduce((acc, current) => (SENIORITY_ORDER[current] > SENIORITY_ORDER[acc] ? current : acc));

  return {
    detected,
    ambiguous: unique.length > 1,
    matches: unique,
  };
};

const tokenize = (value: string) =>
  normalizeAscii(value)
    .split(/[^a-z0-9+#.]+/g)
    .map((token) => token.replace(/^\.+|\.+$/g, ''))
    .filter((token) => token.length > 1);

const asTokenSet = (value: string) => new Set(tokenize(value));

const TOKEN_ALIASES: Record<string, string[]> = {
  javascript: ['javascript', 'js', 'ecmascript'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'reactjs', 'react.js'],
  next: ['next', 'nextjs', 'next.js'],
  node: ['node', 'nodejs', 'node.js'],
  nest: ['nest', 'nestjs', 'nest.js'],
  postgresql: ['postgresql', 'postgres'],
  kubernetes: ['kubernetes', 'k8s'],
  cicd: ['ci', 'cd', 'cicd', 'ci/cd'],
  rest: ['rest', 'api', 'apis'],
  aws: ['aws', 'amazon web services'],
  gcp: ['gcp', 'google cloud'],
  azure: ['azure', 'microsoft azure'],
};

const expandTokenAliases = (tokens: string[]) => {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const aliases of Object.values(TOKEN_ALIASES)) {
      if (aliases.includes(token)) {
        aliases.forEach((alias) => expanded.add(alias));
      }
    }
  }
  return Array.from(expanded);
};

const asExpandedTokenSet = (value: string) => new Set(expandTokenAliases(tokenize(value)));

const intersects = (source: Set<string>, values: string[]) =>
  expandTokenAliases(values).some((value) => source.has(value));

const normalizeScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const parseAmountCandidates = (value: string) =>
  [...value.matchAll(/\d{2,3}(?:[ .]?\d{3})?/g)]
    .map((match) => Number(match[0].replace(/[ .]/g, '')))
    .filter((num) => Number.isFinite(num) && num > 0);

const confidenceWeight = (score: number) => Math.max(0.2, Math.min(1, score));

const EMPLOYMENT_ALIASES: Record<string, string[]> = {
  b2b: ['b2b', 'kontrakt', 'contractor', 'freelance'],
  uop: ['uop', 'employment contract', 'employment agreement', 'umowa o prace'],
  mandate: ['mandate', 'contract of mandate', 'umowa zlecenie'],
  internship: ['internship', 'intern', 'staz', 'graduate', 'entry level'],
};

const WORK_MODE_ALIASES: Record<string, string[]> = {
  remote: ['remote', 'zdal', 'home office', 'home-office', 'fully remote'],
  hybrid: ['hybrid', 'hybryd', 'partially remote'],
  onsite: ['onsite', 'on-site', 'office', 'stacjonarn', 'full-office'],
  mobile: ['mobile', 'field work'],
};

const hasAnyAlias = (normalizedText: string, aliasesByKey: Record<string, string[]>) =>
  Object.values(aliasesByKey).some((aliases) => aliases.some((alias) => normalizedText.includes(alias)));

const normalizeSenioritySlug = (value: string | null | undefined) => {
  const normalized = value ? normalizeAscii(value) : '';
  if (!normalized) {
    return null;
  }
  if (/(intern|trainee|graduate|praktykant|stazysta|staz)/.test(normalized)) {
    return 'intern';
  }
  if (/(junior|associate|assistant|mlodszy)/.test(normalized)) {
    return 'junior';
  }
  if (/(mid|regular|specjalista|specialist|samodzielny)/.test(normalized)) {
    return 'mid';
  }
  if (/(senior|expert|ekspert|starszy|staff)/.test(normalized)) {
    return 'senior';
  }
  if (/(lead|principal|architekt)/.test(normalized)) {
    return 'lead';
  }
  if (/(manager|menedzer|kierownik|head)/.test(normalized)) {
    return 'manager';
  }
  return null;
};

const selectHighestSeniority = (values: string[]) => {
  const normalized = values
    .map((value) => normalizeSenioritySlug(value))
    .filter((value): value is keyof typeof SENIORITY_ORDER => Boolean(value));
  if (!normalized.length) {
    return null;
  }
  return Array.from(new Set(normalized)).reduce((acc, current) =>
    SENIORITY_ORDER[current] > SENIORITY_ORDER[acc] ? current : acc,
  );
};

const getSalaryCandidates = (context: JobContext) => {
  const structured = [context.salaryMin, context.salaryMax]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value));
  if (structured.length) {
    return { values: structured, source: 'structured' as const };
  }
  const textValues = context.salaryText ? parseAmountCandidates(context.salaryText) : [];
  return { values: textValues, source: textValues.length ? ('text' as const) : ('unknown' as const) };
};

export const scoreCandidateAgainstJob = (profile: CandidateProfile, context: JobContext) => {
  const structuredWorkModes = (context.workModes ?? []).filter(Boolean);
  const structuredContractTypes = (context.contractTypes ?? []).filter(Boolean);
  const structuredEmploymentSchedules = (context.employmentSchedules ?? []).filter(Boolean);
  const text = [
    context.title,
    context.text,
    context.location,
    context.employmentType,
    context.contractType,
    ...structuredContractTypes,
    context.employmentSchedule,
    ...structuredEmploymentSchedules,
    context.jobCategory,
    ...structuredWorkModes,
    ...(context.seniorityLevels ?? []).filter(Boolean),
    ...(context.technologies ?? []).filter(Boolean),
    context.salaryText,
  ]
    .filter(Boolean)
    .join(' ');
  const normalizedText = normalizeAscii(text);
  const jobTokens = asExpandedTokenSet(text);
  const structuredWorkModeSet = new Set(structuredWorkModes.map((item) => normalizeAscii(item)));
  const structuredEmploymentTypeSet = new Set(
    [context.contractType, context.employmentSchedule, ...structuredContractTypes, ...structuredEmploymentSchedules]
      .map((item) => normalizeString(item))
      .filter(Boolean),
  );
  const hardViolations: string[] = [];
  const softGaps: string[] = [];
  const matchedCompetencies: Array<{ name: string; confidenceScore: number; importance: string }> = [];
  const primarySeniority = profile.candidateCore.seniority.primary;
  const maxAllowedSeniorityOrder = primarySeniority ? SENIORITY_ORDER[primarySeniority] : null;
  const evidence: Record<string, string> = {};
  const structuredSeniority = selectHighestSeniority(context.seniorityLevels ?? []);
  const titleSenioritySignal = detectJobSeniority(context.title ?? '');
  const bodySenioritySignal = detectJobSeniority(text);
  const senioritySignal = structuredSeniority
    ? { detected: structuredSeniority, ambiguous: false, matches: [structuredSeniority], source: 'structured' }
    : titleSenioritySignal.detected
      ? { ...titleSenioritySignal, source: 'title' }
      : { ...bodySenioritySignal, source: 'text' };

  if (maxAllowedSeniorityOrder && senioritySignal.detected) {
    const jobOrder = SENIORITY_ORDER[senioritySignal.detected];
    if (jobOrder > maxAllowedSeniorityOrder) {
      hardViolations.push('seniority');
      evidence.seniority = senioritySignal.source;
    }
  }
  if (senioritySignal.ambiguous && senioritySignal.source !== 'structured') {
    softGaps.push('seniority:ambiguous');
    evidence.seniority = senioritySignal.source;
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

  const roleTokens = expandTokenAliases(profile.targetRoles.flatMap((role) => tokenize(role.title)));
  const roleMatches = roleTokens.filter((token) => jobTokens.has(token));
  const roleScore = roleTokens.length ? (roleMatches.length / roleTokens.length) * 20 : 0;

  const keywordTokens = expandTokenAliases(profile.searchSignals.keywords.flatMap((item) => tokenize(item.value)));
  const keywordMatches = keywordTokens.filter((token) => jobTokens.has(token));
  const keywordScore = keywordTokens.length ? (keywordMatches.length / keywordTokens.length) * 10 : 0;

  const hardWorkModes = profile.workPreferences.hardConstraints.workModes;
  if (hardWorkModes.length) {
    const modes = hardWorkModes.filter((mode) => {
      const aliases = WORK_MODE_ALIASES[mode] ?? [mode];
      return structuredWorkModeSet.has(normalizeAscii(mode)) || aliases.some((alias) => normalizedText.includes(alias));
    });
    if (!modes.length && (structuredWorkModeSet.size > 0 || hasAnyAlias(normalizedText, WORK_MODE_ALIASES))) {
      hardViolations.push('workModes');
    } else if (!modes.length) {
      softGaps.push('workModes:unspecified');
    }
  }

  const hardEmploymentTypes = profile.workPreferences.hardConstraints.employmentTypes;
  if (hardEmploymentTypes.length) {
    const aliasHits = hardEmploymentTypes.filter((type) => {
      const aliases = EMPLOYMENT_ALIASES[type] ?? [type];
      return structuredEmploymentTypeSet.has(type) || aliases.some((alias) => normalizedText.includes(alias));
    });
    if (
      !aliasHits.length &&
      (structuredEmploymentTypeSet.size > 0 || hasAnyAlias(normalizedText, EMPLOYMENT_ALIASES))
    ) {
      hardViolations.push('employmentTypes');
    } else if (!aliasHits.length) {
      softGaps.push('employmentTypes:unspecified');
    }
  }

  if (profile.workPreferences.hardConstraints.minSalary) {
    const expectedMin = profile.workPreferences.hardConstraints.minSalary.amount;
    const discovered = getSalaryCandidates(context);
    evidence.salary = discovered.source;
    if (!discovered.values.length) {
      softGaps.push('minSalary:unknown');
    } else if (Math.max(...discovered.values) < expectedMin) {
      hardViolations.push('minSalary');
    }
  }

  const softWorkModeScore = profile.workPreferences.softPreferences.workModes.reduce((acc, item) => {
    const aliases = WORK_MODE_ALIASES[item.value] ?? [item.value];
    const matched =
      structuredWorkModeSet.has(normalizeAscii(item.value)) || aliases.some((alias) => normalizedText.includes(alias));
    if (!matched) {
      softGaps.push(`workMode:${item.value}`);
      return acc;
    }
    return acc + item.weight * 10;
  }, 0);

  const softEmploymentTypeScore = profile.workPreferences.softPreferences.employmentTypes.reduce((acc, item) => {
    const aliases = EMPLOYMENT_ALIASES[item.value] ?? [item.value];
    const matched =
      structuredEmploymentTypeSet.has(item.value) || aliases.some((alias) => normalizedText.includes(alias));
    if (!matched) {
      softGaps.push(`employmentType:${item.value}`);
      return acc;
    }
    return acc + item.weight * 6;
  }, 0);

  const softSalaryScore = profile.workPreferences.softPreferences.salary
    ? (() => {
        const expected = profile.workPreferences.softPreferences.salary.value.amount;
        const discovered = getSalaryCandidates(context);
        evidence.salary = discovered.source;
        if (!discovered.values.length || Math.max(...discovered.values) < expected) {
          softGaps.push('salary');
          return 0;
        }
        return profile.workPreferences.softPreferences.salary.weight * 6;
      })()
    : 0;

  const competencyScore = competencyTotalWeight > 0 ? (competencyMatchedWeight / competencyTotalWeight) * 48 : 0;
  const contextPenalty =
    (normalizeString(context.title ?? '') ? 0 : 5) +
    ((context.text ?? '').trim().length >= 80 ? 0 : 5) +
    (senioritySignal.ambiguous ? 4 : 0);

  const breakdown = {
    competencyFit: Math.round(Math.max(0, competencyScore - contextPenalty)),
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
    evidence,
  };
};
