import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { authOptions } from '@/libs/auth/config';

type Props = {
  params: { locale: string };
};

export default async function UserProfilePage(props: Props) {
  unstable_setRequestLocale(props.params.locale);

  const [profileTranslations, userMenuTranslations] = await Promise.all([
    getTranslations({ locale: props.params.locale, namespace: 'UserProfile' }),
    getTranslations({ locale: props.params.locale, namespace: 'UserMenu' }),
  ]);

  const session = await getServerSession(authOptions);
  const user = session?.user;
  const roleLabelMap = {
    admin: 'role_admin',
    professional: 'role_professional',
    user: 'role_user',
  } as const;
  type RoleKey = keyof typeof roleLabelMap;
  const role = user?.role as RoleKey | undefined;
  const roleKey = role ? roleLabelMap[role] : null;

  return (
    <>
      <TitleBar
        title={profileTranslations('title_bar')}
        description={profileTranslations('title_bar_description')}
      />

      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium">{profileTranslations('name_label')}</dt>
            <dd className="text-muted-foreground">
              {user?.name || profileTranslations('unknown_value')}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{profileTranslations('email_label')}</dt>
            <dd className="text-muted-foreground">
              {user?.email || profileTranslations('unknown_value')}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{profileTranslations('role_label')}</dt>
            <dd className="capitalize text-muted-foreground">
              {roleKey
                ? userMenuTranslations(roleKey)
                : profileTranslations('unknown_value')}
            </dd>
          </div>
        </dl>
      </div>
    </>
  );
}
