'use client';

import {
  type ChangeEvent,
  type MutableRefObject,
  type ReactNode,
  useEffect,
  useRef,
  useState,
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
  onDebugEvent?: (type: string, payload?: Record<string, unknown>) => void;
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
}: DiaryEntryEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const sideClass = side === 'left' ? 'diary-entry-sheet--left' : 'diary-entry-sheet--right';
  const lastEntryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onDebugEvent?.('mount', { entryKey, editable });
    return () => {
      onDebugEvent?.('unmount', { entryKey });
    };
  }, [editable, entryKey, onDebugEvent]);

  useEffect(() => {
    onDebugEvent?.('setEditable', { editable });
  }, [editable, onDebugEvent]);

  useEffect(() => {
    const isNewEntry = lastEntryKeyRef.current !== entryKey;
    const valueChanged = initialValue !== value;

    if (!isNewEntry && !valueChanged) {
      onDebugEvent?.('prefill.skip', { entryKey, reason: 'already-initialised' });
      return;
    }

    lastEntryKeyRef.current = entryKey;
    suppressOnChangeRef.current = true;
    setValue(initialValue);
    const lines = initialValue ? initialValue.split('\n').length : 0;
    onDebugEvent?.('prefill.apply', {
      entryKey,
      valueLength: initialValue.length,
      lines,
    });
  }, [entryKey, initialValue, onDebugEvent, suppressOnChangeRef, value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    const wasSuppressed = suppressOnChangeRef.current;
    const source: 'user' | 'external' = wasSuppressed ? 'external' : 'user';
    setValue(nextValue);
    onChange(nextValue, { source });
    if (wasSuppressed) {
      suppressOnChangeRef.current = false;
    }
    onDebugEvent?.('onChangePlugin', {
      entryKey,
      source,
      wasSuppressed,
      textLength: nextValue.length,
    });
  };

  return (
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
          <textarea
            className="diary-entry-content"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={!editable}
            aria-readonly={!editable}
          />
        </div>
      </div>
    </div>
  );
};

export { DiaryEntryEditor };
