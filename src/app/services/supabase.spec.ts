import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';

import { SupabaseService } from './supabase';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('SupabaseService', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockClear();
    TestBed.configureTestingModule({});
  });

  it('creates and exposes one configured client instance', () => {
    const service = TestBed.inject(SupabaseService);

    expect(service.client).toBeTruthy();
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(
      'https://oslontuktgqzrsbetdur.supabase.co',
      'sb_publishable_wneSRSKtk-Tg8TmwtheD5w_nX9Cj4ue',
    );
  });
});
