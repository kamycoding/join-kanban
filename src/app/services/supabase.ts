import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oslontuktgqzrsbetdur.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wneSRSKtk-Tg8TmwtheD5w_nX9Cj4ue';

@Service()
export class SupabaseService {
  readonly client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
