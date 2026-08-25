import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';

import { SupabaseService } from './supabase';

@Service()
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionState = signal<Session | null>(null);
  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly ready: Promise<void>;

  constructor() {
    const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionState.set(session);
      this.loadingState.set(false);
    });

    this.destroyRef.onDestroy(() => data.subscription.unsubscribe());
    this.ready = this.restoreSession();
  }

  async signInWithPassword(email: string, password: string): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      this.errorState.set(error.message);
      this.loadingState.set(false);
      return false;
    }

    this.sessionState.set(data.session);
    this.loadingState.set(false);
    return data.session !== null;
  }

  async signOut(): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const { error } = await this.supabase.auth.signOut({ scope: 'local' });

    if (error) {
      this.errorState.set(error.message);
      this.loadingState.set(false);
      return false;
    }

    this.sessionState.set(null);
    this.loadingState.set(false);
    return true;
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private async restoreSession(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      this.errorState.set(error.message);
      this.loadingState.set(false);
      return;
    }

    this.sessionState.set(data.session);
    this.loadingState.set(false);
  }
}
