import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth';
import { guestOnlyGuard } from './guest-only.guard';

describe('guestOnlyGuard', () => {
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

  it('allows an unauthenticated user to open a guest-only page', async () => {
    isAuthenticated.mockReturnValue(false);

    await expect(runGuard('/login')).resolves.toBe(true);
    expect(validateSession).not.toHaveBeenCalled();
  });

  it('redirects an authenticated user to the summary', async () => {
    isAuthenticated.mockReturnValue(true);
    validateSession.mockResolvedValue(true);

    const result = await runGuard('/login');
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/summary');
  });

  it('allows access when a restored session is no longer valid', async () => {
    isAuthenticated.mockReturnValue(true);
    validateSession.mockResolvedValue(false);

    await expect(runGuard('/sign-up')).resolves.toBe(true);
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() =>
      guestOnlyGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }
});
