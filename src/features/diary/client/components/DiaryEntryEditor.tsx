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
import { useEffect, useMemo, useRef } from 'react';

type DiaryEntryEditorProps = {
  value: string;
  placeholder: string;
  editable: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  fontClassName: string;
  colorClassName: string;
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

const PrefillPlugin = ({ value }: { value: string }) => {
  const [editor] = useLexicalComposerContext();
  const lastValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastValueRef.current === value) {
      return;
    }

    const currentText = editor.getEditorState().read(() => {
      const root = $getRoot();
      return root.getTextContent();
    });

    if (currentText === value) {
      lastValueRef.current = value;
      return;
    }

    lastValueRef.current = value;
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
    });
  }, [editor, value]);

  return null;
};

const DiaryEntryEditor = ({
  value,
  placeholder,
  editable,
  onChange,
  onFocus,
  fontClassName,
  colorClassName,
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

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <OnEditableChange editable={editable} />
      <PrefillPlugin value={value} />
      <OnChangePlugin
        onChange={(editorState) => {
          editorState.read(() => {
            const root = $getRoot();
            onChange(root.getTextContent());
          });
        }}
      />
      <HistoryPlugin />
      <div className={`diary-entry-paper ${fontClassName} ${colorClassName}`}>
        <RichTextPlugin
          contentEditable={(
            <ContentEditable
              className="diary-entry-content"
              onFocus={onFocus}
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
    </LexicalComposer>
  );
};

export { DiaryEntryEditor };
