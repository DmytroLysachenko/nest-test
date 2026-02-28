'use client';

import { useMemo } from 'react';

import { useWorkflowQueries } from '@/features/workflow/model/hooks/use-workflow-queries';

type WorkflowStepKey =
  | 'profile-input'
  | 'documents-uploaded'
  | 'documents-extracted'
  | 'career-profile-ready'
  | 'scrape-run-completed'
  | 'notebook-materialized';

type WorkflowStep = {
  key: WorkflowStepKey;
  label: string;
  done: boolean;
  hint: string;
};

export const useWorkflowState = (token: string | null) => {
  const { profileInputQuery, documentsQuery, careerProfileQuery, runsQuery, offersQuery } = useWorkflowQueries(token);

  return useMemo(() => {
    const documents = documentsQuery.data ?? [];
    const uploadedDocuments = documents.length;
    const readyDocuments = documents.filter((document) => document.extractionStatus === 'READY').length;
    const failedDocuments = documents.filter((document) => document.extractionStatus === 'FAILED').length;
    const runs = runsQuery.data?.items ?? [];
    const hasCompletedRun = runs.some((run) => run.status === 'COMPLETED');

    const hasProfileInput = Boolean(profileInputQuery.data);
    const hasUploadedDocuments = uploadedDocuments > 0;
    const hasReadyDocuments = readyDocuments > 0;
    const hasReadyCareerProfile = Boolean(careerProfileQuery.data && careerProfileQuery.data.status === 'READY');
    const hasNotebookOffers = (offersQuery.data?.total ?? 0) > 0;

    const steps: WorkflowStep[] = [
      {
        key: 'profile-input',
        label: 'Save profile input',
        done: hasProfileInput,
        hint: hasProfileInput
          ? 'Latest profile input is available.'
          : 'Create profile input to unlock document upload.',
      },
      {
        key: 'documents-uploaded',
        label: 'Upload documents',
        done: hasUploadedDocuments,
        hint: hasUploadedDocuments ? `${uploadedDocuments} document(s) uploaded.` : 'Upload at least one PDF document.',
      },
      {
        key: 'documents-extracted',
        label: 'Extract document text',
        done: hasReadyDocuments,
        hint: hasReadyDocuments
          ? `${readyDocuments} document(s) extracted and ready.`
          : failedDocuments > 0
            ? `${failedDocuments} document(s) failed extraction.`
            : 'Run extraction to prepare profile generation.',
      },
      {
        key: 'career-profile-ready',
        label: 'Generate career profile',
        done: hasReadyCareerProfile,
        hint: hasReadyCareerProfile ? 'Active career profile is READY.' : 'Generate an active READY career profile.',
      },
      {
        key: 'scrape-run-completed',
        label: 'Complete at least one scrape run',
        done: hasCompletedRun,
        hint: hasCompletedRun
          ? 'Scrape run completed successfully.'
          : 'Enqueue scrape and wait for callback completion.',
      },
      {
        key: 'notebook-materialized',
        label: 'Materialize notebook offers',
        done: hasNotebookOffers,
        hint: hasNotebookOffers
          ? `${offersQuery.data?.total ?? 0} offer(s) available in notebook.`
          : 'Notebook offers appear after successful scrape completion.',
      },
    ];

    const completedSteps = steps.filter((step) => step.done).length;
    const totalSteps = steps.length;

    return {
      steps,
      completedSteps,
      totalSteps,
      isLoading:
        profileInputQuery.isLoading ||
        documentsQuery.isLoading ||
        careerProfileQuery.isLoading ||
        runsQuery.isLoading ||
        offersQuery.isLoading,
      hasProfileInput,
      uploadedDocuments,
      readyDocuments,
      failedDocuments,
      hasReadyCareerProfile,
      hasCompletedRun,
      hasNotebookOffers,
      allowDocumentsActions: hasProfileInput,
      allowProfileGeneration: hasProfileInput && hasReadyDocuments,
      allowJobMatching: hasReadyCareerProfile,
      allowScrapeEnqueue: hasReadyCareerProfile,
      allowNotebook: hasReadyCareerProfile || hasCompletedRun || hasNotebookOffers,
    };
  }, [
    careerProfileQuery.data,
    careerProfileQuery.isLoading,
    documentsQuery.data,
    documentsQuery.isLoading,
    offersQuery.data,
    offersQuery.isLoading,
    profileInputQuery.data,
    profileInputQuery.isLoading,
    runsQuery.data?.items,
    runsQuery.isLoading,
  ]);
};
