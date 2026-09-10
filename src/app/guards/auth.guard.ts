import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth';

/**
 * Allows authenticated users to enter protected routes and otherwise redirects to login.
 *
 * @param _route - The route snapshot supplied by Angular Router.
 * @param state - The requested router state containing the return URL.
 * @returns A promise that resolves to `true` or the required login redirect.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.isAuthenticated() && (await auth.validateSession())) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
