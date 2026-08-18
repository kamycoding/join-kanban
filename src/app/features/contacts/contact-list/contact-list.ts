import { Component, computed, input, output } from '@angular/core';
import { Contact } from '../../../models/contact';
import { ContactItem } from './contact-item/contact-item';

interface ContactGroup {
  letter: string;
  contacts: Contact[];
}

@Component({
  selector: 'app-contact-list',
  imports: [ContactItem],
  templateUrl: './contact-list.html',
  styleUrl: './contact-list.scss',
})
export class ContactList {
  readonly contacts = input.required<Contact[]>();
  readonly selectedContact = input<Contact | null>(null);

  readonly contactSelected = output<Contact>();

  readonly groupedContacts = computed<ContactGroup[]>(() => {
    const groups = new Map<string, Contact[]>();

    for (const contact of this.contacts()) {
      const letter = contact.first_name.charAt(0).toUpperCase();

      const group = groups.get(letter) ?? [];
      group.push(contact);
      groups.set(letter, group);
    }

    return Array.from(groups, ([letter, contacts]) => ({
      letter,
      contacts,
    }));
  });
}
