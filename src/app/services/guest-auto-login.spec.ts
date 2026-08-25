import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth';
import { GuestAutoLoginService } from './guest-auto-login';

describe('GuestAutoLoginService', () => {
  const signInAnonymously = vi.fn();
  const isAuthenticated = vi.fn();
  const authService = {
    ready: Promise.resolve(),
    isAuthenticated,
    signInAnonymously,
  } as unknown as AuthService;

  beforeEach(() => {
    signInAnonymously.mockReset();
    isAuthenticated.mockReset();
    isAuthenticated.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
  });

  it('keeps an existing session', async () => {
    isAuthenticated.mockReturnValue(true);

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('creates an anonymous session when no session exists', async () => {
    signInAnonymously.mockResolvedValue(true);

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(signInAnonymously).toHaveBeenCalledOnce();
  });
});
