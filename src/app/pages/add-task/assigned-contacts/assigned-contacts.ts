import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { Contact } from '../../../models/contact';

@Component({
  selector: 'app-assigned-contacts',
  imports: [],
  templateUrl: './assigned-contacts.html',
  styleUrl: './assigned-contacts.scss',
})
export class AssignedContacts {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly contacts = input.required<Contact[]>();
  readonly selectedIds = input.required<string[]>();
  readonly disabled = input(false);
  readonly selectionChange = output<string[]>();
  readonly open = signal(false);

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  toggleDropdown(): void {
    if (!this.disabled()) this.open.update((value) => !value);
  }

  toggleContact(contactId: string): void {
    const ids = this.selectedIds();
    this.selectionChange.emit(
      ids.includes(contactId) ? ids.filter((id) => id !== contactId) : [...ids, contactId],
    );
  }

  isSelected(contactId: string): boolean {
    return this.selectedIds().includes(contactId);
  }

  name(contact: Contact): string {
    return `${contact.first_name} ${contact.last_name}`.trim();
  }

  initials(contact: Contact): string {
    return `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`.toUpperCase();
  }

  selectedContacts(): Contact[] {
    return this.contacts().filter((contact) => this.isSelected(contact.id));
  }
}
