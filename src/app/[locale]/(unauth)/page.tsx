import Link from 'next/link';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { Navbar } from '@/templates/Navbar';
import { getI18nPath } from '@/utils/Helpers';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'landing',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const HomeContent = async ({ locale }: { locale: string }) => {
  const [tLanding, tHome, tBlog, tVocabulary, tTests, tServices] = await Promise.all([
    getTranslations({ locale, namespace: 'landing' }),
    getTranslations({ locale, namespace: 'home' }),
    getTranslations({ locale, namespace: 'blog' }),
    getTranslations({ locale, namespace: 'vocabulary' }),
    getTranslations({ locale, namespace: 'testsPage' }),
    getTranslations({ locale, namespace: 'services' }),
  ]);

  const sections = [
    {
      href: getI18nPath('/blog', locale),
      label: tHome('blog'),
      description: tBlog('description'),
    },
    {
      href: getI18nPath('/vocabulary', locale),
      label: tHome('vocabulary'),
      description: tVocabulary('description'),
    },
    {
      href: getI18nPath('/tests', locale),
      label: tHome('tests'),
      description: tTests('description'),
    },
    {
      href: getI18nPath('/services', locale),
      label: tHome('services'),
      description: tServices('description'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar locale={locale} />

      <main className="mx-auto max-w-5xl px-4 py-16">
        <header className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {tLanding('title')}
          </h1>
          <p className="text-base text-muted-foreground">
            {tLanding('subtitle')}
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          {sections.map(section => (
            <article key={section.href} className="rounded-xl border border-border p-6 shadow-sm transition-shadow hover:shadow-md">
              <h2 className="text-xl font-semibold text-foreground">
                {section.label}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {section.description}
              </p>
              <Link
                href={section.href}
                className="mt-4 inline-flex items-center text-sm font-medium text-primary transition-colors hover:underline"
              >
                {tHome('explore')}
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

const IndexPage = (props: { params: { locale: string } }) => {
  unstable_setRequestLocale(props.params.locale);

  return <HomeContent locale={props.params.locale} />;
};

export default IndexPage;
