import { Component, OnInit, inject, signal } from '@angular/core';
import { Contact } from '../../models/contact';
import { ContactService } from '../../services/contact';
import { Toast } from '../../shared/components/toast/toast';
import {
  ContactDialog,
  ContactDialogState,
  ContactFormValue,
} from './contact-dialog/contact-dialog';
import { ContactDetail } from './contact-detail/contact-detail';
import { ContactList } from './contact-list/contact-list';

const CONTACT_CREATED_MESSAGE = 'Contact successfully created';
const CONTACT_UPDATED_MESSAGE = 'Contact successfully updated';

type ContactToast = {
  id: number;
  message: string;
};

@Component({
  selector: 'app-contacts',
  imports: [ContactList, ContactDetail, ContactDialog, Toast],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts implements OnInit {
  private readonly contactService = inject(ContactService);

  readonly contacts = this.contactService.contacts;
  readonly selectedContact = signal<Contact | null>(null);
  readonly dialogState = signal<ContactDialogState | null>(null);
  readonly savingContact = signal(false);
  readonly successToast = signal<ContactToast | null>(null);

  private nextToastId = 0;

  /**
   * Initializes the component state and loads its required data.
   */
  async ngOnInit(): Promise<void> {
    await this.contactService.getContacts();
  }

  /**
   * Selects contact.
   *
   * @param contact - The contact to process.
   */
  selectContact(contact: Contact): void {
    this.selectedContact.set(contact);
  }

  /**
   * Clears selection.
   */
  clearSelection(): void {
    this.selectedContact.set(null);
  }

  /**
   * Opens add dialog.
   */
  openAddDialog(): void {
    this.dialogState.set({ mode: 'add' });
  }

  /**
   * Opens edit dialog.
   *
   * @param contact - The contact to process.
   */
  openEditDialog(contact: Contact): void {
    this.dialogState.set({
      mode: 'edit',
      contact,
    });
  }

  /**
   * Closes dialog.
   */
  closeDialog(): void {
    this.dialogState.set(null);
  }

  /**
   * Performs the dismiss toast operation.
   *
   * @param id - The identifier of the affected record.
   */
  dismissToast(id: number): void {
    this.successToast.update((toast) => (toast?.id === id ? null : toast));
  }

  /**
   * Persists contact.
   *
   * @param value - The value to process.
   */
  async saveContact(value: ContactFormValue): Promise<void> {
    const dialog = this.dialogState();

    if (!dialog) {
      return;
    }

    this.savingContact.set(true);

    try {
      const savedContact =
        dialog.mode === 'add'
          ? await this.createContact(value)
          : await this.updateContact(dialog.contact, value);

      if (savedContact && this.dialogState() === dialog) {
        this.handleSuccessfulSave(dialog, savedContact);
      }
    } finally {
      this.savingContact.set(false);
    }
  }

  /**
   * Removes contact.
   *
   * @param contact - The contact to process.
   */
  async deleteContact(contact: Contact): Promise<void> {
    const deleted = await this.contactService.deleteContact(contact.id);

    if (deleted) {
      this.clearSelection();
      this.closeDialog();
    }
  }

  /**
   * Creates contact.
   *
   * @param value - The value to process.
   * @returns A promise that resolves to the resulting value, or `null` when unavailable.
   */
  private createContact(value: ContactFormValue): Promise<Contact | null> {
    return this.contactService.createContact(value.name, value.email, value.phone);
  }

  /**
   * Updates contact.
   *
   * @param contact - The contact to process.
   * @param value - The value to process.
   * @returns A promise that resolves to the resulting value, or `null` when unavailable.
   */
  private updateContact(contact: Contact, value: ContactFormValue): Promise<Contact | null> {
    return this.contactService.updateContact(contact.id, value.name, value.email, value.phone);
  }

  /**
   * Handles successful save.
   *
   * @param dialog - The dialog state to process.
   * @param contact - The contact to process.
   */
  private handleSuccessfulSave(dialog: ContactDialogState, contact: Contact): void {
    this.selectedContact.set(contact);

    if (dialog.mode === 'edit') {
      this.showSuccessToast(CONTACT_UPDATED_MESSAGE);
    } else {
      this.showSuccessToast(CONTACT_CREATED_MESSAGE);
    }

    this.closeDialog();
  }

  /**
   * Performs the show success toast operation.
   *
   * @param message - The message to display.
   */
  private showSuccessToast(message: string): void {
    this.successToast.set({
      id: ++this.nextToastId,
      message,
    });
  }
}
