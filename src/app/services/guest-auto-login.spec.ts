import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth';
import { GuestAutoLoginService } from './guest-auto-login';

describe('GuestAutoLoginService', () => {
  const signInAnonymously = vi.fn();
  const isAuthenticated = vi.fn();
  const validateSession = vi.fn();
  const authService = {
    ready: Promise.resolve(),
    isAuthenticated,
    validateSession,
    signInAnonymously,
  } as unknown as AuthService;

  beforeEach(() => {
    signInAnonymously.mockReset();
    isAuthenticated.mockReset();
    validateSession.mockReset();
    isAuthenticated.mockReturnValue(false);
    validateSession.mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
  });

  it('keeps an existing session', async () => {
    isAuthenticated.mockReturnValue(true);

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(validateSession).toHaveBeenCalledOnce();
  });

  it('creates an anonymous session when no session exists', async () => {
    signInAnonymously.mockResolvedValue(true);

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(signInAnonymously).toHaveBeenCalledOnce();
    expect(validateSession).not.toHaveBeenCalled();
  });

  it('replaces a cleaned-up guest session', async () => {
    isAuthenticated.mockReturnValue(true);
    validateSession.mockResolvedValue(false);
    signInAnonymously.mockResolvedValue(true);

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(validateSession).toHaveBeenCalledOnce();
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });
});
