import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth';

class AuthServiceStub {
  ready = Promise.resolve();
  authenticated = false;
  isAuthenticated = () => this.authenticated;
}

describe('authGuard', () => {
  let auth: AuthServiceStub;

  const run = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    auth = new AuthServiceStub();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  it('lets a signed-in user through', async () => {
    auth.authenticated = true;

    await expect(run()).resolves.toBe(true);
  });

  it('sends a signed-out visitor to the login page', async () => {
    auth.authenticated = false;

    const result = await run();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
