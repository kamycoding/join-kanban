import { TestBed } from '@angular/core/testing';
import { Session } from '@supabase/supabase-js';

import { AuthService } from './auth';
import { SupabaseService } from './supabase';

describe('AuthService', () => {
  const unsubscribe = vi.fn();
  const getSession = vi.fn();
  const signInWithPassword = vi.fn();
  const signInAnonymously = vi.fn();
  const signOut = vi.fn();
  const onAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe } },
  }));

  const supabaseService = {
    client: {
      auth: {
        getSession,
        signInWithPassword,
        signInAnonymously,
        signOut,
        onAuthStateChange,
      },
    },
  } as unknown as SupabaseService;

  beforeEach(() => {
    unsubscribe.mockReset();
    getSession.mockReset();
    signInWithPassword.mockReset();
    signInAnonymously.mockReset();
    signOut.mockReset();
    onAuthStateChange.mockClear();
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: supabaseService }],
    });
  });

  it('restores the existing browser session', async () => {
    const session = createSession('user-1');
    getSession.mockResolvedValue({ data: { session }, error: null });

    const service = TestBed.inject(AuthService);
    await service.ready;

    expect(service.session()).toBe(session);
    expect(service.user()?.id).toBe('user-1');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('signs in with email and password', async () => {
    const session = createSession('guest-user');
    signInWithPassword.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    });

    const service = TestBed.inject(AuthService);
    await service.ready;

    await expect(service.signInWithPassword('guest@example.com', 'password')).resolves.toBe(true);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'guest@example.com',
      password: 'password',
    });
    expect(service.session()).toBe(session);
  });

  it('signs in anonymously as a guest', async () => {
    const session = createSession('guest-user', undefined, true);
    signInAnonymously.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    });

    const service = TestBed.inject(AuthService);
    await service.ready;

    await expect(service.signInAnonymously()).resolves.toBe(true);
    expect(signInAnonymously).toHaveBeenCalledOnce();
    expect(service.isGuest()).toBe(true);
  });

  it('exposes authentication errors without creating a session', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    const service = TestBed.inject(AuthService);
    await service.ready;

    await expect(service.signInWithPassword('guest@example.com', 'wrong')).resolves.toBe(false);
    expect(service.session()).toBeNull();
    expect(service.error()).toBe('Invalid login credentials');
  });

  it('signs out only the current browser session', async () => {
    getSession.mockResolvedValue({ data: { session: createSession('guest-user') }, error: null });
    signOut.mockResolvedValue({ error: null });

    const service = TestBed.inject(AuthService);
    await service.ready;

    await expect(service.signOut()).resolves.toBe(true);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(service.session()).toBeNull();
  });
});

function createSession(userId: string, email?: string, isAnonymous = false): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      email,
      is_anonymous: isAnonymous,
    },
  } as Session;
}
