export const summarizeActiveProfile = (contentJson: unknown) => {
  if (!contentJson || typeof contentJson !== 'object' || Array.isArray(contentJson)) {
    return null;
  }

  const root = contentJson as Record<string, unknown>;
  const candidateCore =
    root.candidateCore && typeof root.candidateCore === 'object' && !Array.isArray(root.candidateCore)
      ? (root.candidateCore as Record<string, unknown>)
      : null;
  const targetRoles = Array.isArray(root.targetRoles) ? root.targetRoles : [];
  const searchSignals =
    root.searchSignals && typeof root.searchSignals === 'object' && !Array.isArray(root.searchSignals)
      ? (root.searchSignals as Record<string, unknown>)
      : null;
  const keywords = Array.isArray(searchSignals?.keywords) ? searchSignals.keywords : [];

  return {
    headline: typeof candidateCore?.headline === 'string' ? candidateCore.headline : null,
    summary: typeof candidateCore?.summary === 'string' ? candidateCore.summary : null,
    targetRoles: targetRoles
      .map((role) =>
        role && typeof role === 'object' && !Array.isArray(role) && typeof role.title === 'string' ? role.title : null,
      )
      .filter((value): value is string => Boolean(value))
      .slice(0, 5),
    searchableKeywords: keywords
      .map((item) =>
        item && typeof item === 'object' && !Array.isArray(item) && typeof item.value === 'string' ? item.value : null,
      )
      .filter((value): value is string => Boolean(value))
      .slice(0, 8),
  };
};

export const buildPrepTalkingPoints = ({
  offerTitle,
  company,
  nextStep,
  followUpNote,
  profileSummary,
  matchMeta,
}: {
  offerTitle: string;
  company: string | null;
  nextStep: string | null;
  followUpNote: string | null;
  profileSummary: ReturnType<typeof summarizeActiveProfile>;
  matchMeta: Record<string, unknown> | null;
}) => {
  const points: string[] = [];

  if (profileSummary?.headline) {
    points.push(`Lead with your ${profileSummary.headline} background and connect it to ${offerTitle}.`);
  }

  if (company) {
    points.push(`Explain why ${company} is worth the next reply instead of sending a generic follow-up.`);
  }

  if (nextStep) {
    points.push(`Keep the next move explicit: ${nextStep}.`);
  }

  if (followUpNote) {
    points.push(`Re-use your follow-up note: ${followUpNote}.`);
  }

  const llmSummary = typeof matchMeta?.llmSummary === 'string' ? matchMeta.llmSummary : null;
  if (llmSummary) {
    points.push(llmSummary);
  }

  return points.slice(0, 4);
};

export const buildVerifyBeforeReply = ({
  applicationUrl,
  contactName,
  followUpAt,
}: {
  applicationUrl: string | null;
  contactName: string | null;
  followUpAt: Date | null;
}) => {
  const items: string[] = [];

  if (!contactName) {
    items.push('Confirm who should receive the next message.');
  }

  if (!applicationUrl) {
    items.push('Save the application thread or ATS link before replying.');
  }

  if (!followUpAt) {
    items.push('Schedule the next checkpoint so this role does not drift.');
  }

  if (!items.length) {
    items.push('Verify the follow-up date, recipient, and thread before you send the next message.');
  }

  return items;
};

export const extractRequirementHighlights = (requirements: unknown) => {
  if (!requirements || typeof requirements !== 'object') {
    return [] as string[];
  }

  if (Array.isArray(requirements)) {
    return requirements.filter((item): item is string => typeof item === 'string').slice(0, 4);
  }

  const record = requirements as Record<string, unknown>;
  const buckets = ['mustHave', 'niceToHave', 'required', 'optional', 'items'];
  const values: string[] = [];

  for (const bucket of buckets) {
    const current = record[bucket];
    if (!Array.isArray(current)) {
      continue;
    }

    for (const item of current) {
      if (typeof item === 'string' && item.trim()) {
        values.push(item.trim());
      }
    }
  }

  return Array.from(new Set(values)).slice(0, 4);
};
