import { Component, input, output } from '@angular/core';
import { Contact } from '../../../../models/contact';

@Component({
  selector: 'app-contact-item',
  imports: [],
  templateUrl: './contact-item.html',
  styleUrl: './contact-item.scss',
})
export class ContactItem {
  readonly contact = input.required<Contact>();
  readonly selected = input(false);

  readonly selectedContact = output<Contact>();

  selectContact(): void {
    this.selectedContact.emit(this.contact());
  }

  get fullName(): string {
    const contact = this.contact();

    return `${contact.first_name} ${contact.last_name}`.trim();
  }

  get initials(): string {
    const contact = this.contact();

    return `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`.toUpperCase();
  }
}
