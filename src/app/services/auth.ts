import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { UserProfile } from '../models/user-profile';
import { SupabaseService } from './supabase';

@Service()
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionState = signal<Session | null>(null);
  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);
  private readonly profileState = signal<UserProfile | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isGuest = computed(() => this.profile()?.is_guest ?? this.user()?.is_anonymous === true);

  readonly displayName = computed(() => {
    const profileName = this.profile()?.full_name.trim();

    if (profileName) {
      return profileName;
    }

    const metadataName = this.user()?.user_metadata?.['full_name'];

    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName.trim();
    }

    const emailName = this.user()?.email?.split('@')[0]?.trim();

    if (emailName) {
      return emailName;
    }

    return this.isGuest() ? 'Guest' : 'User';
  });

  readonly initials = computed(() => {
    const nameParts = this.displayName().split(/\s+/).filter(Boolean);

    if (nameParts.length === 0) {
      return 'U';
    }

    if (nameParts.length === 1) {
      return nameParts[0].slice(0, 2).toUpperCase();
    }

    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  });
  readonly ready: Promise<void>;

  constructor() {
    const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionState.set(session);
      this.loadingState.set(false);
    });

    this.destroyRef.onDestroy(() => data.subscription.unsubscribe());
    this.ready = this.restoreSession();
  }

  async signUp(name: string, email: string, password: string): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      this.errorState.set('Name is required.');
      this.loadingState.set(false);
      return false;
    }

    const { error } = await this.supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedName,
        },
      },
    });

    if (error) {
      this.errorState.set(error.message);
      this.loadingState.set(false);
      return false;
    }

    this.loadingState.set(false);
    return true;
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

  async signInAnonymously(): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase.auth.signInAnonymously();

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

  async loadProfile(): Promise<boolean> {
    const userId = this.user()?.id;

    if (!userId) {
      this.profileState.set(null);
      return false;
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, is_guest, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      this.profileState.set(null);
      this.errorState.set(error.message);
      return false;
    }

    this.profileState.set(data as UserProfile);
    return true;
  }

  async validateSession(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    const { data, error } = await this.supabase.auth.getUser();

    if (!error && data.user) {
      return true;
    }

    await this.supabase.auth.signOut({ scope: 'local' });
    this.sessionState.set(null);
    return false;
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
