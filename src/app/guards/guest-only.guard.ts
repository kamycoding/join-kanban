import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth';

export const guestOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (!auth.isAuthenticated()) {
    return true;
  }

  return (await auth.validateSession()) ? router.createUrlTree(['/summary']) : true;
};
