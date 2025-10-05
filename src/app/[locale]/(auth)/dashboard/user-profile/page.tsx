import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { UserProfileForm } from '@/features/profile/UserProfileForm';
import { authOptions } from '@/libs/auth/config';
import { db } from '@/libs/db';
import { users } from '@/models/auth';
import { getI18nPath } from '@/utils/Helpers';

type Props = {
  params: { locale: string };
};

export default async function UserProfilePage(props: Props) {
  unstable_setRequestLocale(props.params.locale);

  const [profileTranslations, session] = await Promise.all([
    getTranslations({ locale: props.params.locale, namespace: 'UserProfile' }),
    getServerSession(authOptions),
  ]);

  const userId = session?.user?.id;

  if (!userId) {
    redirect(getI18nPath('/sign-in', props.params.locale));
  }

  const [dbUser] = await db
    .select({
      name: users.name,
      familyName: users.familyName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!dbUser) {
    redirect(getI18nPath('/dashboard', props.params.locale));
  }

  return (
    <>
      <TitleBar
        title={profileTranslations('title_bar')}
        description={profileTranslations('title_bar_description')}
      />

      <UserProfileForm
        locale={props.params.locale}
        user={{
          firstName: dbUser.name ?? '',
          familyName: dbUser.familyName ?? null,
          email: dbUser.email,
          phoneNumber: dbUser.phoneNumber ?? null,
          avatar: dbUser.avatar ?? null,
        }}
      />
    </>
  );
}
