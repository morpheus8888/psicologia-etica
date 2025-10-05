import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { Navbar } from '@/templates/Navbar';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'Dashboard',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(props.params.locale);

  return (
    <>
      <Navbar locale={props.params.locale} />

      <main className="bg-muted py-6">
        <div className="mx-auto min-h-[calc(100vh-120px)] max-w-screen-xl px-3 pb-16">
          {props.children}
        </div>
      </main>
    </>
  );
}

export const dynamic = 'force-dynamic';
