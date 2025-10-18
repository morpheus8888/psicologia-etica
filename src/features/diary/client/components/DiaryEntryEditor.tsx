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

type EditorInteractionEvent = 'pointer' | 'focus' | 'blur';

type EditorInteractionDetails = {
  restorePlanned?: boolean;
  throttled?: boolean;
  deltaSinceRestore?: number | null;
  attempts?: number;
  targetTagName?: string | null;
};

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
  onDebugEvent?: (type: string, payload?: Record<string, unknown>) => void;
  onUserInteraction?: (event: EditorInteractionEvent, details?: EditorInteractionDetails) => void;
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

const OnEditableChange = ({
  editable,
  entryKey,
  onDebugEvent,
}: {
  editable: boolean;
  entryKey: string;
  onDebugEvent?: (type: string, payload?: Record<string, unknown>) => void;
}) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(editable);
    onDebugEvent?.('setEditable', { editable, entryKey });
  }, [editable, editor, entryKey, onDebugEvent]);
  return null;
};

const PrefillPlugin = ({
  value,
  entryKey,
  suppressOnChangeRef,
  onDebugEvent,
}: {
  value: string;
  entryKey: string;
  suppressOnChangeRef: MutableRefObject<boolean>;
  onDebugEvent?: (type: string, payload?: Record<string, unknown>) => void;
}) => {
  const [editor] = useLexicalComposerContext();
  const lastEntryKeyRef = useRef<string | null>(null);
  const hasInitialisedRef = useRef(false);

  useEffect(() => {
    if (lastEntryKeyRef.current === entryKey && hasInitialisedRef.current) {
      onDebugEvent?.('prefill.skip', { entryKey, reason: 'already-initialised' });
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
        hasInitialisedRef.current = true;
        onDebugEvent?.('prefill.apply', { entryKey, valueLength: 0, lines: 0 });
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
      onDebugEvent?.('prefill.apply', { entryKey, valueLength: value.length, lines: lines.length });
    });
  }, [editor, entryKey, onDebugEvent, suppressOnChangeRef, value]);

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
  onDebugEvent,
  onUserInteraction,
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
  const contentEditableRef = useRef<HTMLDivElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  const lastForcedFocusRef = useRef(0);
  const forcedFocusAttemptsRef = useRef(0);
  const restoringFocusRef = useRef(false);

  useEffect(() => {
    onDebugEvent?.('mount', { entryKey, editable });
    return () => {
      onDebugEvent?.('unmount', { entryKey });
    };
  }, [editable, entryKey, onDebugEvent]);

  useEffect(() => {
    const node = contentEditableRef.current;
    if (!node || !onDebugEvent) {
      return undefined;
    }

    const handleBeforeInput = (event: Event) => {
      const inputEvent = event as InputEvent;
      onDebugEvent('dom.beforeinput', {
        inputType: inputEvent.inputType,
        data: inputEvent.data,
        isComposing: inputEvent.isComposing,
      });
    };

    const handleInput = (event: Event) => {
      const inputEvent = event as InputEvent;
      onDebugEvent('dom.input', {
        inputType: inputEvent.inputType,
        data: inputEvent.data,
        isComposing: inputEvent.isComposing,
      });
    };

    const handleComposition = (type: string) => (event: CompositionEvent) => {
      onDebugEvent(`dom.${type}`, {
        data: event.data,
      });
    };

    const handleKey = (type: string) => (event: KeyboardEvent) => {
      onDebugEvent(`dom.${type}`, {
        key: event.key,
        code: event.code,
        isComposing: event.isComposing,
        repeat: event.repeat,
      });
    };

    const handleFocusBlur = (type: 'focus' | 'blur') => (event: FocusEvent) => {
      const hostNode = contentEditableRef.current;
      const relatedTarget = (event.relatedTarget as HTMLElement | null) ?? null;
      const ownerDocument = hostNode?.ownerDocument ?? document;
      const activeElement = ownerDocument.activeElement;
      const now = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();

      if (type === 'focus') {
        if (restoringFocusRef.current) {
          restoringFocusRef.current = false;
          shouldRestoreFocusRef.current = false;
        }
        forcedFocusAttemptsRef.current = 0;
        lastForcedFocusRef.current = now;
        onDebugEvent?.('dom.focus', {
          relatedTagName: relatedTarget?.tagName ?? null,
          relatedId: relatedTarget?.id ?? null,
          activeTagName: activeElement?.tagName ?? null,
        });
        onUserInteraction?.('focus');
        return;
      }

      const hostContainsTarget = Boolean(hostNode && relatedTarget && hostNode.contains(relatedTarget));
      const restorePlanned = Boolean(
        shouldRestoreFocusRef.current
        && hostNode
        && !hostContainsTarget,
      );
      const deltaSinceLast = lastForcedFocusRef.current === 0 ? null : now - lastForcedFocusRef.current;
      const throttled = Boolean(
        restorePlanned
        && deltaSinceLast !== null
        && deltaSinceLast < 150
        && forcedFocusAttemptsRef.current >= 2,
      );

      onDebugEvent?.('dom.blur', {
        restorePlanned,
        relatedTagName: relatedTarget?.tagName ?? null,
        relatedId: relatedTarget?.id ?? null,
        hostContainsTarget,
        deltaSinceRestore: deltaSinceLast,
        attempts: forcedFocusAttemptsRef.current,
        throttled,
      });

      onUserInteraction?.('blur', {
        restorePlanned,
        throttled,
        deltaSinceRestore: deltaSinceLast,
        attempts: forcedFocusAttemptsRef.current,
      });

      if (!restorePlanned || !hostNode) {
        shouldRestoreFocusRef.current = false;
        forcedFocusAttemptsRef.current = 0;
        return;
      }

      shouldRestoreFocusRef.current = false;

      if (throttled) {
        onDebugEvent?.('focus.restore.skip', {
          reason: 'throttled',
          attempts: forcedFocusAttemptsRef.current,
          deltaSinceRestore: deltaSinceLast,
        });
        return;
      }

      if (!deltaSinceLast || deltaSinceLast >= 150) {
        forcedFocusAttemptsRef.current = 0;
      }

      forcedFocusAttemptsRef.current += 1;
      const attempt = forcedFocusAttemptsRef.current;
      lastForcedFocusRef.current = now;

      const restore = () => {
        const editableNode = contentEditableRef.current;
        if (!editableNode) {
          onDebugEvent?.('focus.restore.skip', { reason: 'missing-node', attempt });
          forcedFocusAttemptsRef.current = 0;
          return;
        }
        const latestOwnerDocument = editableNode.ownerDocument ?? document;
        const latestActive = latestOwnerDocument.activeElement;
        if (!latestActive || latestActive === latestOwnerDocument.body) {
          restoringFocusRef.current = true;
          editableNode.focus({ preventScroll: true });
          const selection = latestOwnerDocument.getSelection();
          if (selection) {
            const range = latestOwnerDocument.createRange();
            range.selectNodeContents(editableNode);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          onDebugEvent?.('focus.restore', { reason: 'blur-without-target', attempt, selection: 'end' });
          forcedFocusAttemptsRef.current = 0;
        } else {
          onDebugEvent?.('focus.restore.skip', {
            reason: 'active-preserved',
            attempt,
            activeTagName: latestActive.tagName,
          });
          forcedFocusAttemptsRef.current = 0;
        }
      };

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(restore);
      } else {
        restore();
      }
    };

    const compositionStartHandler = handleComposition('compositionstart');
    const compositionUpdateHandler = handleComposition('compositionupdate');
    const compositionEndHandler = handleComposition('compositionend');
    const keyDownHandler = handleKey('keydown');
    const keyUpHandler = handleKey('keyup');
    const focusHandler = handleFocusBlur('focus');
    const blurHandler = handleFocusBlur('blur');
    const pointerDownHandler = (event: PointerEvent) => {
      shouldRestoreFocusRef.current = true;
      const target = event.target as HTMLElement | null;
      onUserInteraction?.('pointer', {
        targetTagName: target?.tagName ?? null,
      });
      if (onDebugEvent) {
        onDebugEvent('dom.pointerdown', {
          targetTagName: target?.tagName ?? null,
          targetId: target?.id ?? null,
        });
      }
    };

    node.addEventListener('beforeinput', handleBeforeInput);
    node.addEventListener('input', handleInput);
    node.addEventListener('compositionstart', compositionStartHandler);
    node.addEventListener('compositionupdate', compositionUpdateHandler);
    node.addEventListener('compositionend', compositionEndHandler);
    node.addEventListener('keydown', keyDownHandler);
    node.addEventListener('keyup', keyUpHandler);
    node.addEventListener('focus', focusHandler);
    node.addEventListener('blur', blurHandler);
    node.addEventListener('pointerdown', pointerDownHandler, { passive: true });

    return () => {
      node.removeEventListener('beforeinput', handleBeforeInput);
      node.removeEventListener('input', handleInput);
      node.removeEventListener('compositionstart', compositionStartHandler);
      node.removeEventListener('compositionupdate', compositionUpdateHandler);
      node.removeEventListener('compositionend', compositionEndHandler);
      node.removeEventListener('keydown', keyDownHandler);
      node.removeEventListener('keyup', keyUpHandler);
      node.removeEventListener('focus', focusHandler);
      node.removeEventListener('blur', blurHandler);
      node.removeEventListener('pointerdown', pointerDownHandler);
    };
  }, [onDebugEvent, onUserInteraction]);

  useEffect(() => {
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const hostNode = contentEditableRef.current;
      if (!hostNode) {
        return;
      }
      const targetNode = event.target as Node | null;
      const inside = Boolean(targetNode && hostNode.contains(targetNode));
      shouldRestoreFocusRef.current = inside;
      if (!inside) {
        shouldRestoreFocusRef.current = false;
        forcedFocusAttemptsRef.current = 0;
      }
      if (onDebugEvent) {
        const element = targetNode instanceof HTMLElement ? targetNode : null;
        onDebugEvent('dom.pointerdown.global', {
          inside,
          targetTagName: element?.tagName ?? null,
          targetId: element?.id ?? null,
        });
      }
    };
    document.addEventListener('pointerdown', handleGlobalPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleGlobalPointerDown, true);
    };
  }, [onDebugEvent]);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <OnEditableChange editable={editable} entryKey={entryKey} onDebugEvent={onDebugEvent} />
      <PrefillPlugin
        value={initialValue}
        entryKey={entryKey}
        suppressOnChangeRef={suppressOnChangeRef}
        onDebugEvent={onDebugEvent}
      />
      <OnChangePlugin
        onChange={(editorState) => {
          editorState.read(() => {
            const root = $getRoot();
            const wasSuppressed = suppressOnChangeRef.current;
            const source = wasSuppressed ? 'external' : 'user';
            const textContent = root.getTextContent();
            onChange(textContent, { source });
            if (source === 'user') {
              shouldRestoreFocusRef.current = true;
            }
            if (wasSuppressed) {
              suppressOnChangeRef.current = false;
            }
            onDebugEvent?.('onChangePlugin', {
              entryKey,
              source,
              wasSuppressed,
              textLength: textContent.length,
            });
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
                  ref={contentEditableRef}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    const target = event.target as HTMLElement | null;
                    onUserInteraction?.('pointer', {
                      targetTagName: target?.tagName ?? null,
                    });
                  }}
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
