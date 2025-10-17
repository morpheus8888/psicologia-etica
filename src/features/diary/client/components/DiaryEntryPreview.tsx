import { memo, type ReactNode } from 'react';

type DiaryEntryPreviewProps = {
  heading: string;
  statusLabel?: string | null;
  body: string;
  placeholder: string;
  fontClassName: string;
  colorClassName: string;
  actions?: ReactNode;
};

const MAX_PREVIEW_LINES = 8;

const normaliseBody = (body: string) => body.replace(/\r\n/g, '\n');

const takePreviewLines = (body: string, placeholder: string) => {
  const trimmedBody = body.trim();
  if (trimmedBody.length === 0) {
    return [placeholder];
  }

  return normaliseBody(trimmedBody)
    .split('\n')
    .map(line => line.trimEnd())
    .filter((line, _index, source) => line.length > 0 || source.length === 1)
    .slice(0, MAX_PREVIEW_LINES);
};

const DiaryEntryPreviewComponent = ({
  heading,
  statusLabel,
  body,
  placeholder,
  fontClassName,
  colorClassName,
  actions,
}: DiaryEntryPreviewProps) => {
  const previewLines = takePreviewLines(body, placeholder);

  return (
    <div
      data-diary-sheet="true"
      className="diary-entry-sheet pointer-events-auto relative z-10 flex h-full flex-col gap-4"
    >
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
          <div className="diary-entry-content whitespace-pre-wrap break-words leading-relaxed">
            {previewLines.map((line, index) => (
              <p key={`${heading}-preview-${index}`} className="mb-2 text-sm text-foreground/90 last:mb-0">
                {line.length === 0 ? '\u00A0' : line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DiaryEntryPreview = memo(DiaryEntryPreviewComponent);

export { DiaryEntryPreview };
