'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/Helpers';

export type ToolbarLabels = {
  bold: string;
  italic: string;
  underline: string;
  bulletList: string;
  orderedList: string;
  quote: string;
  heading: string;
  link: string;
  clear: string;
  linkPrompt: string;
};

type RichTextEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  ariaLabel: string;
  placeholder?: string;
  labels: ToolbarLabels;
  className?: string;
};

const toolbarConfig: Array<{
  key: keyof ToolbarLabels | 'heading' | 'link' | 'clear';
  command: string;
  value?: string;
  labelKey: keyof ToolbarLabels;
}> = [
  { key: 'bold', command: 'bold', labelKey: 'bold' },
  { key: 'italic', command: 'italic', labelKey: 'italic' },
  { key: 'underline', command: 'underline', labelKey: 'underline' },
  { key: 'bulletList', command: 'insertUnorderedList', labelKey: 'bulletList' },
  { key: 'orderedList', command: 'insertOrderedList', labelKey: 'orderedList' },
  { key: 'quote', command: 'formatBlock', value: 'blockquote', labelKey: 'quote' },
  { key: 'heading', command: 'formatBlock', value: 'h2', labelKey: 'heading' },
  { key: 'link', command: 'createLink', labelKey: 'link' },
  { key: 'clear', command: 'removeFormat', labelKey: 'clear' },
];

export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  placeholder,
  labels,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const current = editorRef.current;
    if (current.innerHTML !== value) {
      current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) {
      return;
    }
    onChange(editorRef.current.innerHTML);
  };

  const exec = (command: string, commandValue?: string) => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current.innerHTML);
  };

  const handleToolbarClick = (command: string, commandValue?: string) => {
    if (command === 'createLink') {
      /* eslint-disable-next-line no-alert */
      const url = window.prompt(labels.linkPrompt, 'https://');
      if (url) {
        exec(command, url);
      }
      return;
    }

    exec(command, commandValue);
  };

  return (
    <div className={cn('rounded-lg border border-border bg-background shadow-sm', className)}>
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/70 px-2 py-1.5">
        {toolbarConfig.map(item => (
          <Button
            key={item.key}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium"
            onMouseDown={event => event.preventDefault()}
            onClick={() => handleToolbarClick(item.command, item.value)}
            aria-label={labels[item.labelKey]}
            title={labels[item.labelKey]}
          >
            {renderButtonLabel(item.key)}
          </Button>
        ))}
      </div>
      <div className="relative">
        {!isFocused && isContentEmpty(value) && placeholder && (
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          className="min-h-[220px] w-full bg-background p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          onInput={handleInput}
          onBlur={() => setIsFocused(false)}
          onFocus={() => setIsFocused(true)}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}

function renderButtonLabel(key: string) {
  switch (key) {
    case 'bold':
      return <span className="font-semibold">B</span>;
    case 'italic':
      return <span className="italic">I</span>;
    case 'underline':
      return <span className="underline">U</span>;
    case 'bulletList':
      return '•';
    case 'orderedList':
      return '1.';
    case 'quote':
      return '“”';
    case 'heading':
      return 'H2';
    case 'link':
      return '🔗';
    case 'clear':
      return '×';
    default:
      return key;
  }
}

function isContentEmpty(html: string) {
  if (!html) {
    return true;
  }

  const stripped = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();

  return stripped.length === 0;
}
