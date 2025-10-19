import { unstable_setRequestLocale } from 'next-intl/server';
import React from 'react';

import { AnimatedDiaryDemo } from '@/features/diary-lite/components';
import { Navbar } from '@/templates/Navbar';

type PageProps = {
  params: { locale: string };
};

export default async function FlipbookDemo({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);

  return (
    <div className="min-h-screen bg-background">
      <Navbar locale={params.locale} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Prototipo
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Diario animato (prototipo CSS)
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Questa pagina sostituisce il vecchio flipbook e usa il nuovo wrapper leggero basato su animazioni CSS 3D.
            Usa i controlli per sfogliare gli spread e valuta il feeling visivo rispetto all&rsquo;implementazione precedente.
          </p>
        </header>

        <AnimatedDiaryDemo locale={params.locale} />
      </main>
    </div>
  );
}
