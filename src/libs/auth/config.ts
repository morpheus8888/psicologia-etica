import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { db } from '@/libs/db';
import { users } from '@/models/auth';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/sign-in' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as { id?: string; role?: 'user' | 'professional' | 'admin' };
        if (typedUser.id) {
          token.id = typedUser.id;
        }
        token.role = typedUser.role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = (token.role ?? 'user') as 'user' | 'professional' | 'admin';
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) {
          return null;
        }
        const email = creds.email.toLowerCase().trim();
        const [u] = await db.select().from(users).where(eq(users.email, email));
        if (!u?.passwordHash) {
          return null;
        }
        const ok = await bcrypt.compare(creds.password, u.passwordHash);
        if (!ok) {
          return null;
        }
        return { id: u.id, email: u.email, name: u.name, role: u.role } as any;
      },
    }),
  ],
};

export default NextAuth(authOptions);
