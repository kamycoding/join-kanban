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

  /**
   * Initializes the instance and registers its required lifecycle behavior.
   */
  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.closeDropdown();
      }
    });
  }

  /**
   * Closes on outside click.
   *
   * @param event - The event to handle.
   */
  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  /**
   * Closes on escape.
   *
   * @param event - The event to handle.
   */
  @HostListener('keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    if (this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeDropdown(true);
    }
  }

  /**
   * Toggles dropdown.
   */
  toggleDropdown(): void {
    if (!this.disabled()) {
      this.open.update((value) => !value);
    }
  }

  /**
   * Toggles contact.
   *
   * @param contactId - The identifier of the affected contact.
   */
  toggleContact(contactId: string): void {
    if (this.disabled()) return;

    const ids = this.selectedIds();
    this.selectionChange.emit(
      ids.includes(contactId) ? ids.filter((id) => id !== contactId) : [...ids, contactId],
    );
  }

  /**
   * Determines whether the selected.
   *
   * @param contactId - The identifier of the affected contact.
   * @returns Whether the requested condition is met.
   */
  isSelected(contactId: string): boolean {
    return this.selectedIds().includes(contactId);
  }

  /**
   * Performs the name operation.
   *
   * @param contact - The contact to process.
   * @returns The resulting string.
   */
  name(contact: Contact): string {
    return `${contact.first_name} ${contact.last_name}`.trim();
  }

  /**
   * Returns the contact's display initials.
   *
   * @param contact - The contact to process.
   * @returns The resulting string.
   */
  initials(contact: Contact): string {
    return `${this.firstCharacter(contact.first_name)}${this.firstCharacter(contact.last_name)}`.toUpperCase();
  }

  /**
   * Selects ed contacts.
   *
   * @returns The resulting collection.
   */
  selectedContacts(): Contact[] {
    return this.contacts().filter((contact) => this.isSelected(contact.id));
  }

  /**
   * Performs the trigger labelled by operation.
   *
   * @returns The resulting string.
   */
  triggerLabelledBy(): string {
    return this.labelledBy() ? `${this.labelledBy()} ${this.summaryId}` : this.summaryId;
  }

  /**
   * Closes dropdown.
   *
   * @param restoreFocus - Whether focus should return to the trigger element.
   */
  private closeDropdown(restoreFocus = false): void {
    this.open.set(false);
    if (restoreFocus) this.trigger().nativeElement.focus();
  }

  /**
   * Returns the first character of a value in uppercase.
   *
   * @param value - The value to process.
   * @returns The resulting string.
   */
  private firstCharacter(value: string): string {
    return Array.from(value.trim())[0] ?? '';
  }
}
