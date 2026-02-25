export type OnboardingDraft = {
  desiredPositions: string[];
  jobDomains: string[];
  coreSkills: string[];
  experienceYearsInRole: number | null;
  targetSeniority: Array<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'>;
  hardWorkModes: Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>;
  softWorkModes: Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>;
  hardContractTypes: Array<'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'>;
  softContractTypes: Array<'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'>;
  sectionNotes: {
    positions: string;
    domains: string;
    skills: string;
    experience: string;
    preferences: string;
  };
  generalNotes: string;
  generationInstructions: string;
};

export const defaultOnboardingDraft: OnboardingDraft = {
  desiredPositions: [],
  jobDomains: [],
  coreSkills: [],
  experienceYearsInRole: null,
  targetSeniority: [],
  hardWorkModes: [],
  softWorkModes: [],
  hardContractTypes: [],
  softContractTypes: [],
  sectionNotes: {
    positions: '',
    domains: '',
    skills: '',
    experience: '',
    preferences: '',
  },
  generalNotes: '',
  generationInstructions: '',
};
