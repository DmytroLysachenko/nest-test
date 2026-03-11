export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const SUPPORTED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
] as const;

export const LEGACY_GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
] as const;

export const SUPPORTED_GCP_GEMINI_LOCATIONS = [
  'global',
  'us-central1',
  'us-east1',
  'us-east4',
  'us-east5',
  'us-south1',
  'us-west1',
  'us-west4',
  'northamerica-northeast1',
  'southamerica-east1',
  'europe-central2',
  'europe-north1',
  'europe-southwest1',
  'europe-west1',
  'europe-west2',
  'europe-west3',
  'europe-west4',
  'europe-west8',
  'europe-west9',
  'asia-northeast1',
  'asia-northeast3',
  'asia-south1',
  'asia-southeast1',
  'australia-southeast1',
] as const;

export const isLegacyGeminiModel = (model: string) =>
  LEGACY_GEMINI_MODELS.includes(model as (typeof LEGACY_GEMINI_MODELS)[number]);

export const isSupportedGeminiModel = (model: string) =>
  SUPPORTED_GEMINI_MODELS.includes(model as (typeof SUPPORTED_GEMINI_MODELS)[number]);

export const isSupportedGeminiLocation = (location: string) =>
  SUPPORTED_GCP_GEMINI_LOCATIONS.includes(location as (typeof SUPPORTED_GCP_GEMINI_LOCATIONS)[number]);
