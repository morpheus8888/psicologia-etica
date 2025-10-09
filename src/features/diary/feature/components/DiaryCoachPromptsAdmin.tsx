import { diaryListCoachPrompts } from '@/features/diary/server/actions';

const formatWindow = (locale: string, startAt?: string | null, endAt?: string | null) => {
  const format = (value?: string | null) => {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const start = format(startAt);
  const end = format(endAt);

  if (start === '—' && end === '—') {
    return '—';
  }

  return `${start} → ${end}`;
};

type DiaryCoachPromptsAdminProps = {
  locale: string;
  scope?: string;
  tags?: string[];
  labels: {
    actionsHint: string;
    empty: string;
    statusActive: string;
    statusInactive: string;
    headers: {
      locale: string;
      scope: string;
      text: string;
      tags: string;
      weight: string;
      status: string;
      window: string;
    };
  };
};

export const DiaryCoachPromptsAdmin = async ({
  locale,
  scope,
  tags,
  labels,
}: DiaryCoachPromptsAdminProps) => {
  const now = new Date();
  const prompts = await diaryListCoachPrompts({
    includeDisabled: true,
    locale,
    scope,
    tags,
    activeAt: now,
  });

  if (prompts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{labels.actionsHint}</p>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">{labels.headers.locale}</th>
              <th className="px-4 py-3 font-semibold">{labels.headers.scope}</th>
              <th className="px-4 py-3 font-semibold">{labels.headers.text}</th>
              <th className="px-4 py-3 font-semibold">{labels.headers.tags}</th>
              <th className="px-4 py-3 font-semibold">{labels.headers.weight}</th>
              <th className="px-4 py-3 font-semibold">{labels.headers.status}</th>
              <th className="px-4 py-3 font-semibold">{labels.headers.window}</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((prompt) => {
              const isActive
                = prompt.enabled
                && (!prompt.startAt || new Date(prompt.startAt).getTime() <= now.getTime())
                && (!prompt.endAt || new Date(prompt.endAt).getTime() >= now.getTime());

              return (
                <tr key={prompt.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{prompt.locale}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{prompt.scope}</td>
                  <td className="whitespace-pre-wrap px-4 py-3 text-sm text-foreground">{prompt.text}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {prompt.tags.length > 0 ? prompt.tags.map(tag => `#${tag}`).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{prompt.weight}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {isActive ? labels.statusActive : labels.statusInactive}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatWindow(locale, prompt.startAt, prompt.endAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
