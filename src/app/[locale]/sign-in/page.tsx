import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SignInForm } from '@/features/auth/SignInForm';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'auth.SignIn',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SignInPage(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);

  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'auth.SignIn',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {t('title')}
            </CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<SignInFormSkeleton />}>
              <SignInForm />
            </Suspense>
          </CardContent>
          <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('help_text')}</span>
            <button
              type="button"
              disabled
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('forgot_password')}
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function SignInFormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
      </div>
      <div className="h-10 w-full rounded bg-muted" />
    </div>
  );
}
