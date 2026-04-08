import type { Location } from 'react-router-dom';
import type { User } from '../types';

/** Paths that should never be used as a post-login return target */
function isAuthFlowPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/verify')
  );
}

/**
 * After successful login/OTP, prefer the route the user tried to open (e.g. purchase),
 * otherwise admin dashboard or home.
 */
export function getPostAuthRedirectPath(user: User, from?: Location | null): string {
  if (from?.pathname && !isAuthFlowPath(from.pathname)) {
    return `${from.pathname}${from.search || ''}${from.hash || ''}`;
  }
  return user.role === 'admin' ? '/admin' : '/';
}
