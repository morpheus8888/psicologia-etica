import NextAuth from '@/libs/auth/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { NextAuth as GET, NextAuth as POST };
