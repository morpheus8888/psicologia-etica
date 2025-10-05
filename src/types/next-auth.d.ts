/* eslint-disable ts/consistent-type-definitions */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    role?: 'user' | 'professional' | 'admin';
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'user' | 'professional' | 'admin';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'user' | 'professional' | 'admin';
  }
}
