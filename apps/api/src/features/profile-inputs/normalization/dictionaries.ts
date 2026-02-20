export const NORMALIZATION_MAPPER_VERSION = 'v1.1.0';

export const SENIORITY_MAP: Record<string, 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'> = {
  intern: 'intern',
  internship: 'intern',
  trainee: 'intern',
  staz: 'intern',
  stazysta: 'intern',
  praktyki: 'intern',
  praktykant: 'intern',
  junior: 'junior',
  mlodszy: 'junior',
  mid: 'mid',
  regular: 'mid',
  specjalista: 'mid',
  senior: 'senior',
  starszy: 'senior',
  lead: 'lead',
  techlead: 'lead',
  liderski: 'lead',
  manager: 'manager',
  menedzer: 'manager',
  kierownik: 'manager',
};

export const SPECIALIZATION_MAP: Record<
  string,
  'frontend' | 'backend' | 'fullstack' | 'devops' | 'data' | 'qa' | 'security' | 'product'
> = {
  frontend: 'frontend',
  backend: 'backend',
  fullstack: 'fullstack',
  devops: 'devops',
  data: 'data',
  analytics: 'data',
  qa: 'qa',
  testing: 'qa',
  security: 'security',
  product: 'product',
};

export const WORK_MODE_MAP: Record<string, 'remote' | 'hybrid' | 'onsite' | 'mobile'> = {
  remote: 'remote',
  zdalnie: 'remote',
  homeoffice: 'remote',
  hybrid: 'hybrid',
  hybrydowo: 'hybrid',
  onsite: 'onsite',
  office: 'onsite',
  stacjonarnie: 'onsite',
  mobile: 'mobile',
};

export const WORK_TIME_MAP: Record<string, 'full-time' | 'part-time' | 'temporary'> = {
  fulltime: 'full-time',
  pelnyetat: 'full-time',
  parttime: 'part-time',
  czescetatu: 'part-time',
  temporary: 'temporary',
  tymczasowa: 'temporary',
  dodatkowa: 'temporary',
};

export const CONTRACT_MAP: Record<string, 'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'> = {
  uop: 'uop',
  umowaoprace: 'uop',
  b2b: 'b2b',
  kontraktb2b: 'b2b',
  zlecenie: 'mandate',
  umowazlecenie: 'mandate',
  dzielo: 'specific-task',
  umowaodzielo: 'specific-task',
  staz: 'internship',
  praktyki: 'internship',
};

export const LANGUAGE_MAP: Record<string, string> = {
  polish: 'pl',
  polski: 'pl',
  english: 'en',
  angielski: 'en',
};

export const LANGUAGE_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'] as const;

export const KNOWN_TECH = [
  'javascript',
  'typescript',
  'react',
  'next.js',
  'next',
  'node.js',
  'node',
  'nestjs',
  'java',
  'python',
  'c#',
  '.net',
  'go',
  'aws',
  'sql',
] as const;

export const KNOWN_CITIES = [
  'warszawa',
  'krakow',
  'gdansk',
  'gdynia',
  'wroclaw',
  'poznan',
  'lodz',
  'katowice',
] as const;

export const STOPWORDS = new Set([
  'and',
  'or',
  'the',
  'for',
  'with',
  'bez',
  'oraz',
  'lub',
  'i',
  'w',
  'na',
  'do',
]);
