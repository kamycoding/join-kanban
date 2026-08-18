import { Service, signal } from '@angular/core';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Contact } from '../models/contact';

@Service()
export class ContactService {
    private readonly supabaseUrl = 'https://oslontuktgqzrsbetdur.supabase.co';
    private readonly supabaseKey = 'sb_publishable_wneSRSKtk-Tg8TmwtheD5w_nX9Cj4ue';
    private readonly supabase = createClient(this.supabaseUrl, this.supabaseKey);

    readonly contacts = signal<Contact[]>([]);

    async getContacts(){
        const {data, error} = await this.supabase
            .from('contacts')
            .select('*')
            .order('first_name', { ascending: true})
            .order('last_name', { ascending: true });
        
        if(error) {
            console.error('Kontakte konnten nicht geladen werden:', error);
            return;
        }

        this.contacts.set(data as Contact[]);
    }
}