import type { User } from '../types';

type LegacyUser = Partial<User> & {
  verified?: boolean;
  role?: string;
};

export const getUserVerificationStatus = (user: LegacyUser | null | undefined): boolean => {
  if (!user) {
    return false;
  }

  return user.is_verified ?? user.verified ?? false;
};

export const normalizeUser = (user: LegacyUser | null | undefined): User | null => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: user.role === 'admin' ? 'admin' : 'user',
    is_verified: getUserVerificationStatus(user),
  } as User;
};
