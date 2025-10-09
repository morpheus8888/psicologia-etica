'use client';

export type DiaryEntryContent = {
  body: string;
  createdAtISO: string;
  updatedAtISO: string;
  coachPromptId?: string | null;
};

export const createEmptyEntryContent = (): DiaryEntryContent => {
  const now = new Date().toISOString();
  return {
    body: '',
    createdAtISO: now,
    updatedAtISO: now,
  };
};

export type DiaryGoalPriority = 'low' | 'medium' | 'high';

export type DiaryGoalContent = {
  title: string;
  description?: string;
  deadlineISO?: string | null;
  priority?: DiaryGoalPriority;
  createdAtISO: string;
  updatedAtISO: string;
};

export const createEmptyGoalContent = (): DiaryGoalContent => {
  const now = new Date().toISOString();
  return {
    title: '',
    description: '',
    deadlineISO: null,
    priority: 'medium',
    createdAtISO: now,
    updatedAtISO: now,
  };
};
