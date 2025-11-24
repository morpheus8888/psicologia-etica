import { NextResponse } from 'next/server';

import { AppConfig } from '@/utils/AppConfig';

export function GET(request: Request) {
  const target = new URL(request.url);
  target.pathname = `/${AppConfig.defaultLocale}/flipbook6`;
  target.search = '';
  target.hash = '';

  return NextResponse.redirect(target);
}
