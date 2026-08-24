import { Service, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { Contact, NewContact } from '../models/contact';
import { splitContactName, validateContactInput } from '../models/contact-validation';

@Service()
export class ContactService {
  private readonly supabaseUrl = 'https://oslontuktgqzrsbetdur.supabase.co';
  private readonly supabaseKey = 'sb_publishable_wneSRSKtk-Tg8TmwtheD5w_nX9Cj4ue';
  private readonly supabase = createClient(this.supabaseUrl, this.supabaseKey);

  readonly contacts = signal<Contact[]>([]);

  async getContacts(): Promise<void> {
    const { data, error } = await this.supabase
      .from('contacts')
      .select('*')
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Contacts could not be loaded.');
      return;
    }

    this.contacts.set(data as Contact[]);
  }

  async createContact(fullName: string, email: string, phone: string): Promise<Contact | null> {
    const result = validateContactInput({ name: fullName, email, phone });

    if (!result.valid) {
      return null;
    }

    const { first_name, last_name } = splitContactName(result.value.name);

    const newContact: NewContact = {
      first_name,
      last_name,
      email: result.value.email,
      phone: result.value.phone,
      color: this.generateContactColor(),
    };

    const { data, error } = await this.supabase
      .from('contacts')
      .insert(newContact)
      .select()
      .single();

    if (error) {
      console.error('Contact could not be created.');
      return null;
    }

    const createdContact = data as Contact;

    this.contacts.update((contacts) =>
      [...contacts, createdContact].sort(
        (contactA, contactB) =>
          contactA.first_name.localeCompare(contactB.first_name, 'de') ||
          contactA.last_name.localeCompare(contactB.last_name, 'de'),
      ),
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

    const randomIndex = Math.floor(Math.random() * colors.length);

    return colors[randomIndex];
  }

  async updateContact(
    id: string,
    fullName: string,
    email: string,
    phone: string,
  ): Promise<Contact | null> {
    const result = validateContactInput({ name: fullName, email, phone });

    if (!result.valid) {
      return null;
    }

    const { first_name, last_name } = splitContactName(result.value.name);

    const { data, error } = await this.supabase
      .from('contacts')
      .update({
        first_name,
        last_name,
        email: result.value.email,
        phone: result.value.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Contact could not be updated.');
      return null;
    }

    const updatedContact = data as Contact;

    this.contacts.update((contacts) =>
      contacts
        .map((contact) => (contact.id === id ? updatedContact : contact))
        .sort(
          (contactA, contactB) =>
            contactA.first_name.localeCompare(contactB.first_name, 'de') ||
            contactA.last_name.localeCompare(contactB.last_name, 'de'),
        ),
    );

    return updatedContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('contacts').delete().eq('id', id);

    if (error) {
      console.error('Contact could not be deleted.');
      return false;
    }

    this.contacts.update((contacts) => contacts.filter((contact) => contact.id !== id));

    return true;
  }
}
