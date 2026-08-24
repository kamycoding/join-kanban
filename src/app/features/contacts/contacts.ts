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

  async ngOnInit(): Promise<void> {
    await this.contactService.getContacts();
  }

  selectContact(contact: Contact): void {
    this.selectedContact.set(contact);
  }

  clearSelection(): void {
    this.selectedContact.set(null);
  }

  openAddDialog(): void {
    this.dialogState.set({ mode: 'add' });
  }

  openEditDialog(contact: Contact): void {
    this.dialogState.set({
      mode: 'edit',
      contact,
    });
  }

  closeDialog(): void {
    this.dialogState.set(null);
  }

  dismissToast(id: number): void {
    this.successToast.update((toast) => (toast?.id === id ? null : toast));
  }

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

      if (savedContact) {
        this.handleSuccessfulSave(dialog, savedContact);
      }
    } finally {
      this.savingContact.set(false);
    }
  }

  async deleteContact(contact: Contact): Promise<void> {
    const deleted = await this.contactService.deleteContact(contact.id);

    if (deleted) {
      this.clearSelection();
      this.closeDialog();
    }
  }

  private createContact(value: ContactFormValue): Promise<Contact | null> {
    return this.contactService.createContact(value.name, value.email, value.phone);
  }

  private updateContact(contact: Contact, value: ContactFormValue): Promise<Contact | null> {
    return this.contactService.updateContact(contact.id, value.name, value.email, value.phone);
  }

  private handleSuccessfulSave(dialog: ContactDialogState, contact: Contact): void {
    if (dialog.mode === 'edit') {
      this.selectedContact.set(contact);
      this.showSuccessToast(CONTACT_UPDATED_MESSAGE);
    } else {
      this.showSuccessToast(CONTACT_CREATED_MESSAGE);
    }

    this.closeDialog();
  }

  private showSuccessToast(message: string): void {
    this.successToast.set({
      id: ++this.nextToastId,
      message,
    });
  }
}
