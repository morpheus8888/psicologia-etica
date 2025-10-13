'use client';

import {
  type InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type EditorThemeClasses,
} from 'lexical';
import {
  type MutableRefObject,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react';

type DiaryEntryEditorProps = {
  entryKey: string;
  initialValue: string;
  placeholder: string;
  editable: boolean;
  onChange: (value: string, meta: { source: 'user' | 'external' }) => void;
  suppressOnChangeRef: MutableRefObject<boolean>;
  fontClassName: string;
  colorClassName: string;
  heading: string;
  statusLabel?: string | null;
  actions?: ReactNode;
  side: 'left' | 'right';
};

const theme: EditorThemeClasses = {
  root: 'diary-entry-editor-root',
  paragraph: 'diary-entry-paragraph',
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'font-mono text-xs bg-muted/60 px-1 py-0.5 rounded',
  },
};

const OnEditableChange = ({ editable }: { editable: boolean }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(editable);
  }, [editor, editable]);
  return null;
};

const PrefillPlugin = ({
  value,
  entryKey,
  suppressOnChangeRef,
}: {
  value: string;
  entryKey: string;
  suppressOnChangeRef: MutableRefObject<boolean>;
}) => {
  const [editor] = useLexicalComposerContext();
  const lastEntryKeyRef = useRef<string | null>(null);
  const hasInitialisedRef = useRef(false);

  useEffect(() => {
    if (lastEntryKeyRef.current === entryKey && hasInitialisedRef.current) {
      return;
    }

    lastEntryKeyRef.current = entryKey;
    hasInitialisedRef.current = false;
    suppressOnChangeRef.current = true;
    editor.update(() => {
      const root = $getRoot();
      root.clear();

      if (!value) {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
        return;
      }

      const lines = value.split('\n');
      lines.forEach((line) => {
        const paragraph = $createParagraphNode();
        if (line.length > 0) {
          paragraph.append($createTextNode(line));
        }
        root.append(paragraph);
      });
      hasInitialisedRef.current = true;
    });
  }, [editor, entryKey, suppressOnChangeRef, value]);

  return null;
};

const DiaryEntryEditor = ({
  entryKey,
  initialValue,
  placeholder,
  editable,
  onChange,
  suppressOnChangeRef,
  fontClassName,
  colorClassName,
  heading,
  statusLabel,
  actions,
  side,
}: DiaryEntryEditorProps) => {
  const initialConfig = useMemo<InitialConfigType>(() => ({
    namespace: 'diary-entry',
    theme,
    onError(error: Error) {
      throw error;
    },
    editable,
    nodes: [],
  }), [editable]);

  const sideClass = side === 'left' ? 'diary-entry-sheet--left' : 'diary-entry-sheet--right';

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <OnEditableChange editable={editable} />
      <PrefillPlugin
        value={initialValue}
        entryKey={entryKey}
        suppressOnChangeRef={suppressOnChangeRef}
      />
      <OnChangePlugin
        onChange={(editorState) => {
          editorState.read(() => {
            const root = $getRoot();
            const source = suppressOnChangeRef.current ? 'external' : 'user';
            onChange(root.getTextContent(), { source });
            if (suppressOnChangeRef.current) {
              suppressOnChangeRef.current = false;
            }
          });
        }}
      />
      <HistoryPlugin />
      <div className={`diary-entry-sheet ${sideClass}`}>
        <div className="diary-entry-heading">
          <div className="diary-entry-heading__info">
            <p className="diary-entry-heading__date">{heading}</p>
            {statusLabel
              ? (
                  <p className="diary-entry-heading__status">
                    {statusLabel}
                  </p>
                )
              : null}
          </div>
          {actions
            ? (
                <div className="diary-entry-heading__actions">
                  {actions}
                </div>
              )
            : null}
        </div>
        <div className="diary-entry-lines">
          <div className={`diary-entry-text ${fontClassName} ${colorClassName}`}>
            <RichTextPlugin
              contentEditable={(
                <ContentEditable
                  className="diary-entry-content"
                />
              )}
              placeholder={(
                <div className="diary-entry-placeholder">
                  {placeholder}
                </div>
              )}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </div>
      </div>
    </LexicalComposer>
  );
};

export { DiaryEntryEditor };
