import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/libs/auth/config';
import { getI18nPath } from '@/utils/Helpers';

export default async function CenteredLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect(getI18nPath('/dashboard', props.params.locale));
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      {props.children}
    </div>
  );
}
