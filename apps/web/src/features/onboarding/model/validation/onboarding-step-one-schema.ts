import { z } from 'zod';

export const onboardingStepOneSchema = z.object({
  desiredPositions: z.array(z.string().trim().min(1)).min(1, 'Add at least one desired position.'),
  jobDomains: z.array(z.string().trim().min(1)),
  coreSkills: z.array(z.string().trim().min(1)).min(3, 'Add at least 3 core skills.'),
  experienceYearsInRole: z.number().min(0, 'Minimum is 0.').max(60, 'Maximum is 60.').nullable(),
  targetSeniority: z.array(z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'manager'])),
  hardWorkModes: z.array(z.enum(['remote', 'hybrid', 'onsite', 'mobile'])),
  softWorkModes: z.array(z.enum(['remote', 'hybrid', 'onsite', 'mobile'])),
  hardContractTypes: z.array(z.enum(['uop', 'b2b', 'mandate', 'specific-task', 'internship'])),
  softContractTypes: z.array(z.enum(['uop', 'b2b', 'mandate', 'specific-task', 'internship'])),
  sectionNotes: z.object({
    positions: z.string().max(1200),
    domains: z.string().max(1200),
    skills: z.string().max(1200),
    experience: z.string().max(1200),
    preferences: z.string().max(1200),
  }),
  generalNotes: z.string().max(3000),
});

export type OnboardingStepOneValues = z.infer<typeof onboardingStepOneSchema>;
