import {
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { Contact } from '../../../../models/contact';

let assignedContactsInstanceCounter = 0;

@Component({
  selector: 'app-assigned-contacts',
  imports: [],
  templateUrl: './assigned-contacts.html',
  styleUrl: './assigned-contacts.scss',
})
export class AssignedContacts {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly instanceId = ++assignedContactsInstanceCounter;

  readonly contacts = input.required<readonly Contact[]>();
  readonly selectedIds = input.required<readonly string[]>();
  readonly disabled = input(false);
  readonly labelledBy = input<string | null>(null);
  readonly selectionChange = output<string[]>();
  readonly open = signal(false);
  readonly menuId = `assigned-contacts-menu-${this.instanceId}`;
  readonly summaryId = `assigned-contacts-summary-${this.instanceId}`;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.closeDropdown();
      }
    });
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  @HostListener('keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    if (this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeDropdown(true);
    }
  }

  toggleDropdown(): void {
    if (!this.disabled()) {
      this.open.update((value) => !value);
    }
  }

  toggleContact(contactId: string): void {
    if (this.disabled()) return;

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
    return `${this.firstCharacter(contact.first_name)}${this.firstCharacter(contact.last_name)}`.toUpperCase();
  }

  selectedContacts(): Contact[] {
    return this.contacts().filter((contact) => this.isSelected(contact.id));
  }

  triggerLabelledBy(): string {
    return this.labelledBy() ? `${this.labelledBy()} ${this.summaryId}` : this.summaryId;
  }

  private closeDropdown(restoreFocus = false): void {
    this.open.set(false);
    if (restoreFocus) this.trigger().nativeElement.focus();
  }

  private firstCharacter(value: string): string {
    return Array.from(value.trim())[0] ?? '';
  }
}
