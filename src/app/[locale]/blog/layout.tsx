import { unstable_setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Navbar } from '@/templates/Navbar';

export default function BlogLayout(props: {
  children: ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(props.params.locale);

  return (
    <div className="min-h-screen bg-background">
      <Navbar locale={props.params.locale} />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        {props.children}
      </main>
    </div>
  );
}
