export interface Contact {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  color: string;
  updated_at: string;
}

export type NewContact = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
