import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth';
import { GuestAutoLoginService } from './guest-auto-login';

describe('GuestAutoLoginService', () => {
  const signInAsGuest = vi.fn();
  const isAuthenticated = vi.fn();
  const authService = {
    ready: Promise.resolve(),
    isAuthenticated,
    signInAsGuest,
  } as unknown as AuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    signInAsGuest.mockReset();
    isAuthenticated.mockReset();
    isAuthenticated.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
  });

  it('keeps an existing session', async () => {
    isAuthenticated.mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(signInAsGuest).not.toHaveBeenCalled();
  });

  it('signs in with the password from the local config', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ password: 'local-password' }), { status: 200 }),
    );
    signInAsGuest.mockResolvedValue(true);

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(fetch).toHaveBeenCalledWith('/guest-auth.local.json', { cache: 'no-store' });
    expect(signInAsGuest).toHaveBeenCalledWith('local-password');
  });

  it('does not attempt a login when no password is configured', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ password: '' }), { status: 200 }),
    );

    await TestBed.inject(GuestAutoLoginService).initialize();

    expect(signInAsGuest).not.toHaveBeenCalled();
  });
});
