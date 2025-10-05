/* eslint-disable ts/consistent-type-definitions */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    role?: 'user' | 'professional' | 'admin';
    familyName?: string | null;
    phoneNumber?: string | null;
    avatar?: string | null;
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'user' | 'professional' | 'admin';
      familyName?: string | null;
      phoneNumber?: string | null;
      avatar?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'user' | 'professional' | 'admin';
    name?: string | null;
    email?: string | null;
    familyName?: string | null;
    phoneNumber?: string | null;
    avatar?: string | null;
  }
}
