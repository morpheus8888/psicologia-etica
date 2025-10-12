import { unstable_setRequestLocale } from 'next-intl/server';
import React from 'react';

import FlipBook from '@/components/FlipBook';
import { Navbar } from '@/templates/Navbar';

type PageProps = {
  params: { locale: string };
};

export default async function FlipbookDemo({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);

  const pages = [
    <div key="p1" className="flex h-full items-center justify-center">
      <div className="size-12 rounded-full border-2 border-dashed border-border" aria-hidden />
    </div>,
    <div key="p2" className="flex h-full items-center justify-center">
      <div className="h-10 w-24 border border-dashed border-border" aria-hidden />
    </div>,
    <div key="p3" className="flex h-full items-center justify-center">
      <div className="size-10 rotate-12 border border-border" aria-hidden />
    </div>,
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar locale={params.locale} />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-xl border bg-card p-4">
          <FlipBook
            // coverTextureUrl="/textures/wood.jpg" // Optional: provide your texture asset
            pages={pages}
            coverFront={<div className="size-full" aria-hidden />}
            coverBack={<div className="size-full" aria-hidden />}
            dimensions={{ size: 'stretch', minWidth: 360, maxWidth: 900, minHeight: 420, maxHeight: 980 }}
          />
        </div>
      </main>
    </div>
  );
}
