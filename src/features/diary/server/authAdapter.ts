import { getServerSession } from 'next-auth';

import type { AuthAdapter } from '@/features/diary/adapters/types';
import { authOptions } from '@/libs/auth/config';

class UnauthenticatedError extends Error {
  constructor() {
    super('UNAUTHENTICATED');
    this.name = 'UnauthenticatedError';
  }
}

const getCurrentUser: AuthAdapter['getCurrentUser'] = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return { id: session.user.id };
};

const getCurrentSession: AuthAdapter['getCurrentSession'] = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const role = typeof session.user.role === 'string' ? session.user.role : 'user';

  return {
    id: session.user.id,
    role,
  };
};

const requireAuth: AuthAdapter['requireAuth'] = async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthenticatedError();
  }

  return user;
};

export const authAdapter: AuthAdapter = {
  getCurrentUser,
  requireAuth,
  getCurrentSession,
};

export { UnauthenticatedError };
