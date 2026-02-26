import type { NormalizedProfileInput } from '@/features/profile-inputs/normalization/schema';

import type { CandidateProfile } from './schema/candidate-profile.schema';

const CITY_ALIASES: Record<string, { city: string; radiusKm?: number; country?: string }> = {
  trojmiasto: { city: 'Gdynia', radiusKm: 35, country: 'PL' },
  tricity: { city: 'Gdynia', radiusKm: 35, country: 'PL' },
  'tri-city': { city: 'Gdynia', radiusKm: 35, country: 'PL' },
  gdynia: { city: 'Gdynia', country: 'PL' },
  gdansk: { city: 'Gdansk', country: 'PL' },
  sopot: { city: 'Sopot', country: 'PL' },
  warszawa: { city: 'Warszawa', country: 'PL' },
  krakow: { city: 'Krakow', country: 'PL' },
  wroclaw: { city: 'Wroclaw', country: 'PL' },
  poznan: { city: 'Poznan', country: 'PL' },
  lodz: { city: 'Lodz', country: 'PL' },
  katowice: { city: 'Katowice', country: 'PL' },
  bydgoszcz: { city: 'Bydgoszcz', country: 'PL' },
};

const normalizeAscii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const canonicalizeCity = (value: string) => {
  const normalized = normalizeAscii(value);
  return CITY_ALIASES[normalized] ?? { city: value.trim(), country: 'PL' };
};

const canonicalizeTechnology = (value: string) => {
  const normalized = normalizeAscii(value).replace(/\s+/g, ' ');
  if (normalized === 'node' || normalized === 'node js') {
    return 'Node.js';
  }
  if (normalized === 'next' || normalized === 'next js') {
    return 'Next.js';
  }
  if (normalized === 'js' || normalized === 'javascript') {
    return 'JavaScript';
  }
  if (normalized === 'ts' || normalized === 'typescript') {
    return 'TypeScript';
  }
  if (normalized === 'react js' || normalized === 'react') {
    return 'React';
  }
  return value.trim();
};

const upsertWeighted = (target: Array<{ value?: string; weight?: number }>, value: string, weight: number) => {
  const normalized = normalizeAscii(value);
  const existing = target.find((item) => item.value && normalizeAscii(item.value) === normalized);
  if (existing) {
    existing.weight = Math.max(existing.weight ?? 0, weight);
    return;
  }
  target.push({ value: value.trim(), weight });
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const canonicalizeCandidateProfile = (
  profile: CandidateProfile,
  normalizedInput: NormalizedProfileInput | null,
): CandidateProfile => {
  const next = structuredClone(profile) as CandidateProfile;

  next.searchSignals.technologies = next.searchSignals.technologies.map((item) => ({
    ...item,
    value: canonicalizeTechnology(item.value),
  }));

  next.workPreferences.hardConstraints.locations = next.workPreferences.hardConstraints.locations.map((item) => {
    if (!item.city) {
      return item;
    }
    const canonical = canonicalizeCity(item.city);
    return {
      ...item,
      city: canonical.city,
      country: item.country ?? canonical.country ?? 'PL',
      radiusKm: item.radiusKm ?? canonical.radiusKm,
    };
  });

  next.workPreferences.softPreferences.locations = next.workPreferences.softPreferences.locations.map((item) => {
    const city = item.value.city;
    if (!city) {
      return item;
    }
    const canonical = canonicalizeCity(city);
    return {
      ...item,
      value: {
        ...item.value,
        city: canonical.city,
        country: item.value.country ?? canonical.country ?? 'PL',
        radiusKm: item.value.radiusKm ?? canonical.radiusKm,
      },
    };
  });

  if (!normalizedInput) {
    return next;
  }

  if (normalizedInput.seniority.length > 0) {
    const primary = normalizedInput.seniority[0];
    next.candidateCore.seniority.primary = primary;
    next.candidateCore.seniority.secondary = uniqueStrings(
      next.candidateCore.seniority.secondary.filter((value) => value !== primary),
    ) as CandidateProfile['candidateCore']['seniority']['secondary'];
  }

  const existingRoleSet = new Set(next.targetRoles.map((item) => normalizeAscii(item.title)));
  let nextPriority = next.targetRoles.reduce((acc, item) => Math.max(acc, item.priority), 0) + 1;
  normalizedInput.roles.forEach((role) => {
    const normalizedRole = normalizeAscii(role.name);
    if (existingRoleSet.has(normalizedRole)) {
      return;
    }
    next.targetRoles.push({
      title: role.name.trim(),
      confidenceScore: 0.85,
      confidenceLevel: 'high',
      priority: nextPriority++,
      rationale: 'Explicitly provided by candidate in onboarding intake.',
    });
    existingRoleSet.add(normalizedRole);
  });

  next.targetRoles = next.targetRoles
    .sort((a, b) => a.priority - b.priority)
    .map((item, index) => ({
      ...item,
      priority: index + 1,
    }));

  next.workPreferences.hardConstraints.workModes = uniqueStrings([
    ...next.workPreferences.hardConstraints.workModes,
    ...normalizedInput.workModes,
  ]) as CandidateProfile['workPreferences']['hardConstraints']['workModes'];

  next.workPreferences.hardConstraints.employmentTypes = uniqueStrings([
    ...next.workPreferences.hardConstraints.employmentTypes,
    ...normalizedInput.contractTypes,
  ]) as CandidateProfile['workPreferences']['hardConstraints']['employmentTypes'];

  if (normalizedInput.locations.length > 0) {
    next.workPreferences.hardConstraints.locations = normalizedInput.locations.map((item) => {
      const canonical = canonicalizeCity(item.city);
      return {
        city: canonical.city,
        country: item.country ?? canonical.country ?? 'PL',
        radiusKm: item.radiusKm ?? canonical.radiusKm,
      };
    });
  }

  if (!next.workPreferences.hardConstraints.minSalary && normalizedInput.salary) {
    next.workPreferences.hardConstraints.minSalary = {
      amount: normalizedInput.salary.min,
      currency: normalizedInput.salary.currency,
      period: normalizedInput.salary.period,
    };
  }

  normalizedInput.technologies.forEach((item) => {
    upsertWeighted(next.searchSignals.technologies, canonicalizeTechnology(item), 0.85);
  });

  normalizedInput.roles.forEach((role) => {
    upsertWeighted(next.searchSignals.keywords, role.name, 0.9);
  });
  normalizedInput.searchPreferences.keywords.forEach((keyword) => {
    upsertWeighted(next.searchSignals.keywords, keyword, 0.8);
  });
  normalizedInput.technologies.forEach((tech) => {
    upsertWeighted(next.searchSignals.keywords, canonicalizeTechnology(tech), 0.75);
  });
  normalizedInput.specializations.forEach((spec) => {
    upsertWeighted(next.searchSignals.specializations, spec, 0.8);
  });

  return next;
};
