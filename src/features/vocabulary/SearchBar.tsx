'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPING_INTERVAL = 120;
const PAUSE_AFTER_TYPING = 1200;
const PAUSE_AFTER_DELETING = 600;

function buildTypingSequence(word: string) {
  const frames: string[] = [];

  for (let i = 1; i <= word.length; i += 1) {
    frames.push(word.slice(0, i));
  }

  for (let i = word.length - 1; i >= 0; i -= 1) {
    frames.push(word.slice(0, i));
  }

  return frames;
}

function useTypingAnimation(samples: string[]) {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const sequences = useMemo(() => samples.map(buildTypingSequence), [samples]);

  useEffect(() => {
    const sampleCount = samples.length;

    if (sampleCount === 0) {
      return undefined;
    }

    let frame = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const run = () => {
      const currentSequence = sequences[index] ?? [''];
      const currentSample = samples[index] ?? '';
      const wordLength = currentSample.length;

      setText(currentSequence[frame] ?? '');

      if (frame === currentSequence.length - 1) {
        timeout = setTimeout(() => {
          setIndex(value => (value + 1) % sampleCount);
          frame = 0;
          run();
        }, PAUSE_AFTER_DELETING);
      } else if (frame === wordLength - 1) {
        timeout = setTimeout(() => {
          frame += 1;
          run();
        }, PAUSE_AFTER_TYPING);
      } else {
        timeout = setTimeout(() => {
          frame += 1;
          run();
        }, TYPING_INTERVAL);
      }
    };

    timeout = setTimeout(run, 400);

    return () => {
      clearTimeout(timeout);
    };
  }, [index, samples, sequences]);

  return text;
}

type VocabularySearchBarProps = {
  actionPath: string;
  defaultValue: string;
  label: string;
  placeholder: string;
  clearLabel: string;
  buttonLabel: string;
  samples: string[];
};

export function VocabularySearchBar(props: VocabularySearchBarProps) {
  const [value, setValue] = useState(props.defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const typingHint = useTypingAnimation(props.samples);

  useEffect(() => {
    setValue(props.defaultValue);
  }, [props.defaultValue]);

  return (
    <form
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-primary/25 bg-gradient-to-br from-card/85 via-background to-card/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.15)] transition focus-within:border-primary/40 focus-within:shadow-[0_28px_70px_rgba(59,130,246,0.25)] focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2 focus-within:ring-offset-background sm:p-8"
      role="search"
      action={props.actionPath}
    >
      <div className="pointer-events-none absolute -left-20 -top-20 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -right-16 size-44 rounded-full bg-primary/5 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <label htmlFor="search" className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
            {props.label}
          </label>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-background/80 shadow-sm backdrop-blur">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-6 text-base text-muted-foreground/60">
            <span className="mr-3 text-lg">🔎</span>
          </div>
          <Input
            id="search"
            type="search"
            inputMode="search"
            name="q"
            value={value}
            onChange={event => setValue(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={props.placeholder}
            className="h-14 w-full rounded-3xl border-0 bg-transparent pl-16 pr-6 text-base focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-16 sm:text-lg"
          />
          {props.samples.length > 0 && value.length === 0 && !isFocused && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-16 flex items-center text-base text-muted-foreground/60"
            >
              {typingHint}
              <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-muted-foreground/70" />
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => setValue('')}
              className="rounded-full bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-muted/80"
            >
              {props.clearLabel}
            </button>
          )}
          <Button
            type="submit"
            variant="default"
            className="h-11 rounded-full px-6 text-sm font-semibold shadow hover:shadow-lg"
          >
            {props.buttonLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
