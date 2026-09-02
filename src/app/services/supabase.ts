import { Service } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oslontuktgqzrsbetdur.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wneSRSKtk-Tg8TmwtheD5w_nX9Cj4ue';

export type SupabaseClientFactory = (url: string, publishableKey: string) => SupabaseClient;

export function buildSupabaseClient(factory: SupabaseClientFactory = createClient): SupabaseClient {
  return factory(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

@Service()
export class SupabaseService {
  readonly client: SupabaseClient = buildSupabaseClient();
}
