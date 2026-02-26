export const detectDocumentType = (fileName: string): 'CV' | 'LINKEDIN' | 'OTHER' => {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('linkedin')) {
    return 'LINKEDIN';
  }
  if (normalized.includes('cv') || normalized.includes('resume')) {
    return 'CV';
  }
  return 'OTHER';
};
