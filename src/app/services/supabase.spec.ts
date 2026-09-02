import { TestBed } from '@angular/core/testing';
import { type SupabaseClient } from '@supabase/supabase-js';

import { buildSupabaseClient, type SupabaseClientFactory, SupabaseService } from './supabase';

describe('SupabaseService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('builds a client with the configured project credentials', () => {
    const client = { from: vi.fn() } as unknown as SupabaseClient;
    const factory = vi.fn(() => client) as SupabaseClientFactory;

    expect(buildSupabaseClient(factory)).toBe(client);
    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith(
      'https://oslontuktgqzrsbetdur.supabase.co',
      'sb_publishable_wneSRSKtk-Tg8TmwtheD5w_nX9Cj4ue',
    );
  });

  it('exposes one client through the shared service instance', () => {
    const firstService = TestBed.inject(SupabaseService);
    const secondService = TestBed.inject(SupabaseService);

    expect(firstService).toBe(secondService);
    expect(firstService.client).toBeTruthy();
    expect(firstService.client).toBe(secondService.client);
  });
});
