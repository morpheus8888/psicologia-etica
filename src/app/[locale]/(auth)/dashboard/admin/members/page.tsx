import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { AvatarBadge } from '@/components/AvatarBadge';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { authOptions } from '@/libs/auth/config';
import { db } from '@/libs/db';
import { users } from '@/models/auth';
import { getI18nPath } from '@/utils/Helpers';

const roles = ['user', 'professional', 'admin'] as const;

type PageProps = {
  params: { locale: string };
};

export default async function AdminMembersPage({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);

  const [t, session, members] = await Promise.all([
    getTranslations({ locale: params.locale, namespace: 'AdminMembers' }),
    getServerSession(authOptions),
    db
      .select({
        id: users.id,
        name: users.name,
        familyName: users.familyName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        avatar: users.avatar,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
  ]);

  if (session?.user?.role !== 'admin') {
    redirect(getI18nPath('/dashboard', params.locale));
  }

  async function updateRole(formData: FormData) {
    'use server';

    const userId = formData.get('userId');
    const role = formData.get('role');
    const locale = formData.get('locale');

    if (typeof userId !== 'string' || typeof role !== 'string' || typeof locale !== 'string') {
      return;
    }

    if (!roles.includes(role as (typeof roles)[number])) {
      return;
    }

    await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId));

    revalidatePath(getI18nPath('/dashboard/admin/members', locale));
  }

  const formatter = new Intl.DateTimeFormat(params.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-8">
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <div className="overflow-hidden rounded-lg border bg-background shadow">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('table.name')}</th>
              <th className="px-4 py-3 font-semibold">{t('table.email')}</th>
              <th className="px-4 py-3 font-semibold">{t('table.role')}</th>
              <th className="px-4 py-3 font-semibold">{t('table.registered')}</th>
              <th className="px-4 py-3 text-right font-semibold">{t('role_label')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {members.map((member) => {
              const rawRole = member.role ?? 'user';
              const roleKey = roles.includes(rawRole as (typeof roles)[number])
                ? (rawRole as (typeof roles)[number])
                : 'user';
              const registeredAt = member.createdAt ? formatter.format(new Date(member.createdAt)) : '—';

              const displayName = [member.name, member.familyName].filter(Boolean).join(' ') || '—';

              return (
                <tr key={member.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <AvatarBadge
                        avatar={member.avatar}
                        fallback={displayName}
                        size="sm"
                      />
                      <span>{displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                  <td className="px-4 py-3 capitalize">{t(`roles.${roleKey}`)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{registeredAt}</td>
                  <td className="px-4 py-3">
                    <form action={updateRole} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="userId" value={member.id} />
                      <input type="hidden" name="locale" value={params.locale} />
                      <select
                        name="role"
                        defaultValue={roleKey}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs capitalize text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {roles.map(option => (
                          <option key={option} value={option}>
                            {t(`roles.${option}`)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                      >
                        {t('update')}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
