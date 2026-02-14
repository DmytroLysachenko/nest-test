import {
  CONTRACT_MAP,
  KNOWN_CITIES,
  KNOWN_TECH,
  LANGUAGE_LEVELS,
  LANGUAGE_MAP,
  NORMALIZATION_MAPPER_VERSION,
  SENIORITY_MAP,
  SPECIALIZATION_MAP,
  STOPWORDS,
  WORK_MODE_MAP,
  WORK_TIME_MAP,
} from './dictionaries';
import {
  type NormalizationMeta,
  type NormalizedProfileInput,
  normalizedProfileInputSchema,
  normalizationMetaSchema,
} from './schema';

type NormalizeInputPayload = {
  targetRoles: string;
  notes?: string | null;
};

const normalizeAscii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const compact = <T>(values: Array<T | null | undefined>) => values.filter((value): value is T => value != null);

const parseCommaSeparated = (value: string) =>
  value
    .split(/[,\n;|]/g)
    .map((part) => part.trim())
    .filter(Boolean);

const parseRadius = (value: string) => {
  const match = value.match(/(\d{1,3})\s?km/i);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSalary = (value: string) => {
  const salaryMatch = value.match(
    /(\d{1,3}(?:[ .]?\d{3})+|\d{2,3}\s?k(?!m)|\d{4,6})\s*(pln|eur|usd)?\s*(mies|month|rok|year|h|hour)?/i,
  );
  if (!salaryMatch) {
    return null;
  }

  const rawAmount = salaryMatch[1].replace(/\s+/g, '').toLowerCase();
  const amount = rawAmount.endsWith('k')
    ? Number(rawAmount.slice(0, -1)) * 1000
    : Number(rawAmount.replace(/\./g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const rawCurrency = salaryMatch[2]?.toUpperCase() ?? 'PLN';
  const currency = ['PLN', 'EUR', 'USD'].includes(rawCurrency) ? rawCurrency : 'PLN';
  const rawPeriod = salaryMatch[3]?.toLowerCase();
  const period =
    rawPeriod === 'rok' || rawPeriod === 'year'
      ? 'year'
      : rawPeriod === 'h' || rawPeriod === 'hour'
        ? 'hour'
        : 'month';

  return {
    min: Math.round(amount),
    currency: currency as 'PLN' | 'EUR' | 'USD',
    period: period as 'month' | 'year' | 'hour',
  };
};

const detectKeywords = <T extends string>(text: string, sourceMap: Record<string, T>) => {
  const detected = new Set<T>();
  for (const [keyword, mapped] of Object.entries(sourceMap)) {
    if (text.includes(keyword)) {
      detected.add(mapped);
    }
  }
  return Array.from(detected);
};

const detectTechnologies = (text: string) => {
  const detected = KNOWN_TECH.filter((tech) => text.includes(tech.replace('.', '')));
  const normalized = detected.map((tech) => (tech === 'node' ? 'node.js' : tech === 'next' ? 'next.js' : tech));
  return Array.from(new Set(normalized)).sort();
};

const detectLanguages = (text: string) => {
  const results: Array<{ code: string; level: 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'native' }> = [];
  for (const [keyword, code] of Object.entries(LANGUAGE_MAP)) {
    if (!text.includes(keyword)) {
      continue;
    }
    const levelMatch = LANGUAGE_LEVELS.find((level) => text.includes(`${keyword} ${level}`) || text.includes(`${level} ${keyword}`));
    results.push({ code, level: levelMatch ?? 'b2' });
  }
  return results;
};

const detectLocations = (text: string) => {
  const radiusKm = parseRadius(text);
  return KNOWN_CITIES.filter((city) => text.includes(city)).map((city) => ({
    city: city.charAt(0).toUpperCase() + city.slice(1),
    radiusKm,
    country: 'PL' as const,
  }));
};

const buildUnknownTokenWarnings = (
  normalizedText: string,
  knownTokenPool: Set<string>,
): Array<{ code: string; value: string }> => {
  const words = normalizedText
    .split(/[^a-z0-9+#.]+/g)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

  const unknown = words.filter((token) => !knownTokenPool.has(token) && Number.isNaN(Number(token)));
  const unique = Array.from(new Set(unknown)).slice(0, 10);
  return unique.map((token) => ({ code: 'UNKNOWN_TOKEN', value: token }));
};

export const normalizeProfileInput = ({
  targetRoles,
  notes,
}: NormalizeInputPayload): { normalizedInput: NormalizedProfileInput; normalizationMeta: NormalizationMeta } => {
  const notesValue = notes?.trim() || null;
  const combinedRaw = [targetRoles, notesValue].filter(Boolean).join(' ');
  const normalizedText = normalizeAscii(combinedRaw);

  const roles = parseCommaSeparated(targetRoles).map((role, index) => ({
    name: role.trim(),
    aliases: [],
    priority: index + 1,
  }));
  const seniority = detectKeywords(normalizedText, SENIORITY_MAP).sort();
  const specializations = detectKeywords(normalizedText, SPECIALIZATION_MAP).sort();
  const workModes = detectKeywords(normalizedText, WORK_MODE_MAP).sort();
  const workTime = detectKeywords(normalizedText, WORK_TIME_MAP).sort();
  const contractTypes = detectKeywords(normalizedText, CONTRACT_MAP).sort();
  const technologies = detectTechnologies(normalizedText);
  const languages = detectLanguages(normalizedText);
  const locations = detectLocations(normalizedText);
  const salary = parseSalary(normalizedText);

  const constraints = {
    noPolishRequired:
      normalizedText.includes('no polish') || normalizedText.includes('bez polskiego') || normalizedText.includes('wpl'),
    ukrainiansWelcome: normalizedText.includes('ukrainian') || normalizedText.includes('ukraincy'),
    onlyEmployerOffers:
      normalizedText.includes('only employer') || normalizedText.includes('oferty pracodawcy') || normalizedText.includes('ao=false'),
    onlyWithProjectDescription:
      normalizedText.includes('project description') || normalizedText.includes('opis projektu') || normalizedText.includes('ap=true'),
  };

  const knownTokenPool = new Set<string>([
    ...Object.keys(SENIORITY_MAP),
    ...Object.keys(SPECIALIZATION_MAP),
    ...Object.keys(WORK_MODE_MAP),
    ...Object.keys(WORK_TIME_MAP),
    ...Object.keys(CONTRACT_MAP),
    ...Object.keys(LANGUAGE_MAP),
    ...KNOWN_TECH.map((item) => item.replace('.', '')),
    ...KNOWN_CITIES,
  ]);
  const warnings = buildUnknownTokenWarnings(normalizedText, knownTokenPool);
  const errors = compact<{ code: string; value: string }>([
    roles.length === 0 ? { code: 'MISSING_ROLES', value: targetRoles || '(empty)' } : null,
  ]);

  const normalizedInput = normalizedProfileInputSchema.parse({
    roles,
    seniority,
    specializations,
    technologies,
    workModes,
    workTime,
    contractTypes,
    locations,
    salary,
    languages,
    constraints,
    freeText: notesValue ?? '',
  });

  const status: 'ok' | 'partial' | 'failed' =
    errors.length > 0 && roles.length === 0 && specializations.length === 0 && technologies.length === 0
      ? 'failed'
      : errors.length > 0
        ? 'partial'
        : 'ok';

  const normalizationMeta = normalizationMetaSchema.parse({
    mapperVersion: NORMALIZATION_MAPPER_VERSION,
    status,
    warnings,
    errors,
    rawSnapshot: {
      targetRoles,
      notes: notesValue,
    },
  });

  return { normalizedInput, normalizationMeta };
};
