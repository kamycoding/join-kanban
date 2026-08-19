import { Component, input, output } from '@angular/core';
import { Contact } from '../../../models/contact';

@Component({
  selector: 'app-contact-detail',
  imports: [],
  templateUrl: './contact-detail.html',
  styleUrl: './contact-detail.scss',
})
export class ContactDetail {
  readonly contact = input.required<Contact>();

  readonly editContact = output<Contact>();
  readonly deleteContact = output<Contact>();
  readonly back = output<void>();

  get fullName(): string {
    const contact = this.contact();

    return `${contact.first_name} ${contact.last_name}`.trim();
  }

  get initials(): string {
    const contact = this.contact();

    return `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`.toUpperCase();
  }
}
