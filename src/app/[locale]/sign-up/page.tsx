import Link from 'next/link';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SignUpForm } from '@/features/auth/SignUpForm';
import { getI18nPath } from '@/utils/Helpers';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'auth.SignUp',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SignUpPage(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);

  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'auth.SignUp',
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
            <SignUpForm />
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="text-center">
              <span>{t('login_cta')}</span>
              {' '}
              <Link
                href={getI18nPath('/sign-in', props.params.locale)}
                className="font-medium text-primary transition-colors hover:underline"
              >
                {t('login_link')}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
