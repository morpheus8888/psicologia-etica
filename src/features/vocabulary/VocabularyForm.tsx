'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import {
  createVocabularyEntryAction,
  updateVocabularyEntryAction,
  type VocabularyActionState,
  vocabularyInitialState,
} from '@/app/[locale]/(auth)/dashboard/admin/vocabulary/actions';
import { RichTextEditor, type ToolbarLabels } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { normalizeSlug } from '@/utils/slug';

type VocabularyFormProps = {
  locale: string;
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    term: string;
    slug: string;
    excerpt: string;
    content: string;
    isWordOfDay: boolean;
  } | null;
  cancelHref: string;
  fieldLabels: {
    title: string;
    slug: string;
    slugHint: string;
    excerpt: string;
    excerptHint: string;
    content: string;
    wordOfDay: string;
    wordOfDayHint: string;
  };
  toolbarLabels: ToolbarLabels;
  placeholders: {
    content: string;
  };
  messages: {
    submit: string;
    saving: string;
    success: string;
    error: string;
    cancel: string;
  };
  errors: Record<string, string>;
};

export function VocabularyForm({
  locale,
  mode,
  initialData,
  cancelHref,
  fieldLabels,
  toolbarLabels,
  placeholders,
  messages,
  errors,
}: VocabularyFormProps) {
  const router = useRouter();
  const action = mode === 'create' ? createVocabularyEntryAction : updateVocabularyEntryAction;
  const [state, formAction] = useFormState<VocabularyActionState, FormData>(action, vocabularyInitialState);

  const [term, setTerm] = useState(initialData?.term ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [isWordOfDay, setIsWordOfDay] = useState(initialData?.isWordOfDay ?? false);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialData?.slug));

  useEffect(() => {
    if (state.status === 'success' && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    const next = normalizeSlug(term);
    setSlug(next);
  }, [term, slugTouched]);

  const fieldError = (field: string) => {
    if (!state.fieldErrors?.[field]) {
      return null;
    }
    return errors[state.fieldErrors[field]] ?? errors.invalid ?? null;
  };

  const showGeneralError = state.status === 'error' && !state.fieldErrors;

  return (
    <form action={formAction} className="space-y-8">
      {initialData?.id && <input type="hidden" name="id" value={initialData.id} readOnly />}
      <input type="hidden" name="locale" value={locale} readOnly />
      <input type="hidden" name="content" value={content} readOnly />
      <input type="hidden" name="isWordOfDay" value={isWordOfDay ? 'true' : 'false'} readOnly />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="term">{fieldLabels.title}</Label>
          <Input
            id="term"
            name="term"
            value={term}
            onChange={event => setTerm(event.target.value)}
            maxLength={120}
            required
            aria-describedby={fieldError('term') ? 'term-error' : undefined}
          />
          {fieldError('term') && (
            <p className="text-xs text-destructive" id="term-error">
              {fieldError('term')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">{fieldLabels.slug}</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              if (!slugTouched) {
                setSlugTouched(true);
              }
            }}
            onBlur={() => setSlugTouched(true)}
            maxLength={140}
            required
            aria-describedby={fieldError('slug') ? 'slug-error slug-hint' : 'slug-hint'}
          />
          <p className="text-xs text-muted-foreground" id="slug-hint">
            {fieldLabels.slugHint}
          </p>
          {fieldError('slug') && (
            <p className="text-xs text-destructive" id="slug-error">
              {fieldError('slug')}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">{fieldLabels.excerpt}</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          value={excerpt}
          onChange={event => setExcerpt(event.target.value)}
          maxLength={320}
          rows={4}
          aria-describedby={fieldError('excerpt') ? 'excerpt-error excerpt-hint' : 'excerpt-hint'}
          required
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground" id="excerpt-hint">
          <span>{fieldLabels.excerptHint}</span>
          <span className="tabular-nums">
            {excerpt.length}
            <span aria-hidden="true">/320</span>
          </span>
        </div>
        {fieldError('excerpt') && (
          <p className="text-xs text-destructive" id="excerpt-error">
            {fieldError('excerpt')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{fieldLabels.content}</Label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          ariaLabel={fieldLabels.content}
          placeholder={placeholders.content}
          labels={toolbarLabels}
        />
        {fieldError('content') && (
          <p className="text-xs text-destructive" id="content-error">
            {fieldError('content')}
          </p>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="size-4 rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            checked={isWordOfDay}
            onChange={event => setIsWordOfDay(event.target.checked)}
          />
          <span className="text-sm font-medium text-foreground">{fieldLabels.wordOfDay}</span>
        </label>
        <p className="text-sm text-muted-foreground">{fieldLabels.wordOfDayHint}</p>
      </div>

      {showGeneralError && (
        <p className="text-sm text-destructive">{messages.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={messages.submit} savingLabel={messages.saving} />
        <Button variant="ghost" asChild>
          <Link href={cancelHref}>{messages.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}

function SubmitButton({ label, savingLabel }: { label: string; savingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="px-6 py-2 text-sm font-medium" disabled={pending}>
      {pending ? savingLabel : label}
    </Button>
  );
}
