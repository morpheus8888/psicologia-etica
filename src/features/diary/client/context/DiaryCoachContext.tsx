'use client';

/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { DiaryCoachPromptFilter, DiaryCoachPromptRecord } from '@/features/diary/adapters/types';
import { diaryListCoachPrompts } from '@/features/diary/server/actions';

import { pickWeightedRandom } from '../prompts';

export type CoachState = 'idle' | 'ask' | 'insert' | 'cheer' | 'sleep';

type DiaryCoachContextValue = {
  state: CoachState;
  prompt: DiaryCoachPromptRecord | null;
  load: (filter: DiaryCoachPromptFilter) => Promise<void>;
  pickNext: () => DiaryCoachPromptRecord | null;
  setState: (next: CoachState) => void;
  lastPromptAt: number | null;
  lastInteractionAt: number | null;
  recordActivity: () => void;
};

const DiaryCoachContext = createContext<DiaryCoachContextValue | null>(null);

type DiaryCoachProviderProps = {
  children: React.ReactNode;
  random?: () => number;
};

export const DiaryCoachProvider = ({ children, random = Math.random }: DiaryCoachProviderProps) => {
  const [state, setState] = useState<CoachState>('idle');
  const [prompt, setPrompt] = useState<DiaryCoachPromptRecord | null>(null);
  const [prompts, setPrompts] = useState<DiaryCoachPromptRecord[]>([]);
  const lastPromptAtRef = useRef<number | null>(null);
  const lastInteractionAtRef = useRef<number | null>(null);

  const load = useCallback(async (filter: DiaryCoachPromptFilter) => {
    const list = await diaryListCoachPrompts(filter);
    setPrompts(list);
  }, []);

  const pickNext = useCallback(() => {
    if (prompts.length === 0) {
      setPrompt(null);
      return null;
    }

    const selected = pickWeightedRandom(
      prompts.map(item => ({ item, weight: item.weight ?? 1 })),
      random,
    );

    setPrompt(selected);
    lastPromptAtRef.current = Date.now();
    lastInteractionAtRef.current = Date.now();
    return selected;
  }, [prompts, random]);

  const updateState = useCallback((nextState: CoachState) => {
    setState(nextState);
    lastInteractionAtRef.current = Date.now();
  }, []);

  const recordActivity = useCallback(() => {
    lastInteractionAtRef.current = Date.now();
  }, []);

  const value = useMemo<DiaryCoachContextValue>(
    () => ({
      state,
      prompt,
      load,
      pickNext,
      setState: updateState,
      lastPromptAt: lastPromptAtRef.current,
      lastInteractionAt: lastInteractionAtRef.current,
      recordActivity,
    }),
    [load, pickNext, prompt, recordActivity, state, updateState],
  );

  return <DiaryCoachContext.Provider value={value}>{children}</DiaryCoachContext.Provider>;
};

export const useDiaryCoach = () => {
  const context = useContext(DiaryCoachContext);
  if (!context) {
    throw new Error('useDiaryCoach must be used within DiaryCoachProvider');
  }
  return context;
};
