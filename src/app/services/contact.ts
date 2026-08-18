import { Service, signal } from '@angular/core';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

@Service()
export class ContactService {
    supabaseUrl = 'https://oslontuktgqzrsbetdur.supabase.co';
    supabaseKey = 'sb_publishable_wneSRSKtk-Tg8TmwtheD5w_nX9Cj4ue';
    supabase = createClient(this.supabaseUrl, this.supabaseKey);
}