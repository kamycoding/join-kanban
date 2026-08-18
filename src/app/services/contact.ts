import { Service, signal } from '@angular/core';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Contact, NewContact } from '../models/contact';

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

    private splitFullName(fullName: string): {
        first_name: string;
        last_name: string;
    } {
        const nameParts = fullName.trim().split(/\s+/);

        if (nameParts.length === 1) {
        return {
            first_name: nameParts[0],
            last_name: '',
        };
        }

        const lastName = nameParts.pop()!;

        return {
        first_name: nameParts.join(' '),
        last_name: lastName,
        };
    }

    async createContact(
        fullName: string,
        email: string,
        phone: string
        ): Promise<Contact | null> {
        if (!fullName.trim()) {
            console.error('Der Name darf nicht leer sein.');
            return null;
        }

        const { first_name, last_name } =
            this.splitFullName(fullName);

        const newContact: NewContact = {
            first_name,
            last_name,
            email: email.trim(),
            phone: phone.trim(),
            color: this.generateContactColor(),
        };

        const { data, error } = await this.supabase
            .from('contacts')
            .insert(newContact)
            .select()
            .single();

        if (error) {
            console.error(
            'Kontakt konnte nicht gespeichert werden:',
            error
            );
            return null;
        }

        const createdContact = data as Contact;

        this.contacts.update((contacts) =>
            [...contacts, createdContact].sort(
            (contactA, contactB) =>
                contactA.first_name.localeCompare(
                contactB.first_name,
                'de'
                ) ||
                contactA.last_name.localeCompare(
                contactB.last_name,
                'de'
                )
            )
        );

        return createdContact;
    }

    private generateContactColor(): string {
        const colors = [
            '#ff7a00',
            '#462f8a',
            '#1fd7c1',
            '#6e52ff',
            '#9327ff',
            '#fc71ff',
            '#ffbb2b',
            '#ff4646',
            '#00bee8',
            '#124658',
            '#0038ff',
            '#29abe2',
        ];

        const randomIndex = Math.floor(
            Math.random() * colors.length
        );

        return colors[randomIndex];
    }
}