import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const isAuthenticated = vi.fn();
  const validateSession = vi.fn();
  const authService = {
    ready: Promise.resolve(),
    isAuthenticated,
    validateSession,
  } as unknown as AuthService;

  beforeEach(() => {
    isAuthenticated.mockReset();
    validateSession.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('allows an authenticated user with a valid session', async () => {
    isAuthenticated.mockReturnValue(true);
    validateSession.mockResolvedValue(true);

    await expect(runGuard('/board')).resolves.toBe(true);
    expect(validateSession).toHaveBeenCalledOnce();
  });

  it('redirects an unauthenticated user to login with the return URL', async () => {
    isAuthenticated.mockReturnValue(false);

    const result = await runGuard('/board');
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/login?returnUrl=%2Fboard',
    );
    expect(validateSession).not.toHaveBeenCalled();
  });

  it('redirects a user whose restored session is no longer valid', async () => {
    isAuthenticated.mockReturnValue(true);
    validateSession.mockResolvedValue(false);

    const result = await runGuard('/contacts');
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/login?returnUrl=%2Fcontacts',
    );
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }
});
