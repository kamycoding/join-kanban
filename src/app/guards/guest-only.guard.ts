import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth';

/**
 * Keeps authenticated users out of guest-only routes such as the login page.
 *
 * @returns A promise that resolves to `true` or a redirect to the summary page.
 */
export const guestOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (!auth.isAuthenticated()) {
    return true;
  }

  return (await auth.validateSession()) ? router.createUrlTree(['/summary']) : true;
};
