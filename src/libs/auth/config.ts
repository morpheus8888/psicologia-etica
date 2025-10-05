import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { db } from '@/libs/db';
import { users } from '@/models/auth';

type Role = 'user' | 'professional' | 'admin';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/sign-in' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as {
          id?: string;
          role?: Role;
          familyName?: string | null;
          phoneNumber?: string | null;
          avatar?: string | null;
          email?: string | null;
          name?: string | null;
        };

        if (typedUser.id) {
          token.id = typedUser.id;
        }

        token.role = typedUser.role ?? 'user';
        token.name = typedUser.name ?? token.name;
        token.email = typedUser.email ?? token.email;
        token.familyName = typedUser.familyName ?? token.familyName ?? null;
        token.phoneNumber = typedUser.phoneNumber ?? token.phoneNumber ?? null;
        token.avatar = typedUser.avatar ?? token.avatar ?? null;
      }

      if (token.id) {
        const [dbUser] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            familyName: users.familyName,
            phoneNumber: users.phoneNumber,
            avatar: users.avatar,
            role: users.role,
          })
          .from(users)
          .where(eq(users.id, token.id as string));

        if (dbUser) {
          token.name = dbUser.name ?? null;
          token.email = dbUser.email;
          token.familyName = dbUser.familyName ?? null;
          token.phoneNumber = dbUser.phoneNumber ?? null;
          token.avatar = dbUser.avatar ?? null;
          token.role = (dbUser.role ?? 'user') as Role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = (token.role ?? 'user') as Role;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name ?? null;
        session.user.email = (token.email as string | null | undefined) ?? session.user.email ?? null;
        session.user.familyName = (token.familyName as string | null | undefined) ?? null;
        session.user.phoneNumber = (token.phoneNumber as string | null | undefined) ?? null;
        session.user.avatar = (token.avatar as string | null | undefined) ?? null;
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
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          familyName: u.familyName,
          phoneNumber: u.phoneNumber,
          avatar: u.avatar,
          role: u.role,
        } as any;
      },
    }),
  ],
};

export default NextAuth(authOptions);
