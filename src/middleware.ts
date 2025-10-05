import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import createIntlMiddleware from 'next-intl/middleware';

const intl = createIntlMiddleware({
  locales: ['it', 'en'],
  defaultLocale: 'it',
  localePrefix: 'as-needed',
});

function isAdminPath(pathname: string) {
  return /^(?:\/(?:it|en)\/admin(?:\/|$)|\/admin(?:\/|$))/.test(pathname);
}

function isProPath(pathname: string) {
  return /^(?:\/(?:it|en)\/pro(?:\/|$)|\/pro(?:\/|$))/.test(pathname);
}

export default withAuth(
  async (req: NextRequest) => {
    const res = intl(req);
    const token = await getToken({ req, raw: false });
    const role = (token as any)?.role as string | undefined;
    const { pathname } = req.nextUrl;

    if (isAdminPath(pathname) && role !== 'admin') {
      return NextResponse.redirect(new URL('/sign-in', req.nextUrl));
    }
    if (isProPath(pathname) && role !== 'professional' && role !== 'admin') {
      return NextResponse.redirect(new URL('/sign-in', req.nextUrl));
    }

    return res ?? NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  },
);

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
