import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { vi } from 'vitest';

import { Contact } from '../../models/contact';
import { ContactService } from '../../services/contact';
import { Contacts } from './contacts';

describe('Contacts', () => {
  let component: Contacts;
  let fixture: ComponentFixture<Contacts>;
  let contacts: WritableSignal<Contact[]>;
  let contactService: {
    contacts: typeof contacts;
    getContacts: ReturnType<typeof vi.fn>;
    createContact: ReturnType<typeof vi.fn>;
    updateContact: ReturnType<typeof vi.fn>;
    deleteContact: ReturnType<typeof vi.fn>;
  };

  const createdContact: Contact = {
    id: 'created-contact',
    created_at: '2026-08-20T00:00:00.000Z',
    first_name: 'Anna',
    last_name: 'Schmidt',
    email: 'anna@example.com',
    phone: '+49123456789',
    color: '#ff7a00',
    updated_at: '2026-08-20T00:00:00.000Z',
  };

  beforeEach(async () => {
    contacts = signal<Contact[]>([]);
    contactService = {
      contacts,
      getContacts: vi.fn().mockResolvedValue(undefined),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      deleteContact: vi.fn(),
    };

    await TestBed.configureTestingModule({ imports: [Contacts] })
      .overrideProvider(ContactService, { useValue: contactService })
      .compileComponents();

    fixture = TestBed.createComponent(Contacts);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the success toast after a contact is created', async () => {
    contactService.createContact.mockImplementation(async () => {
      contacts.update((current) => [...current, createdContact]);
      return createdContact;
    });
    component.openAddDialog();

    await component.saveContact(validFormValue());
    fixture.detectChanges();

    expect(component.successToast()?.message).toBe('Contact successfully created');
    expect(fixture.nativeElement.querySelector('app-toast')?.textContent).toContain(
      'Contact successfully created',
    );
    expect(fixture.nativeElement.querySelector('.contacts-toast-viewport')).toBeTruthy();
    expect(component.contacts()).toContain(createdContact);
    expect(component.dialogState()).toBeNull();
  });

  it('does not show the success toast when creation fails', async () => {
    contactService.createContact.mockResolvedValue(null);
    component.openAddDialog();

    await component.saveContact(validFormValue());
    fixture.detectChanges();

    expect(component.successToast()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-toast')).toBeNull();
  });

  it('shows success feedback and refreshes the selected contact after an edit', async () => {
    contactService.updateContact.mockResolvedValue(createdContact);
    component.openEditDialog(createdContact);

    await component.saveContact(validFormValue());

    expect(component.successToast()?.message).toBe('Contact successfully updated');
    expect(component.selectedContact()).toBe(createdContact);
    expect(component.dialogState()).toBeNull();
  });

  it('clears the selected contact after a successful deletion', async () => {
    contactService.deleteContact.mockResolvedValue(true);
    component.selectContact(createdContact);

    await component.deleteContact(createdContact);

    expect(component.selectedContact()).toBeNull();
    expect(contactService.deleteContact).toHaveBeenCalledWith(createdContact.id);
  });

  it('creates a fresh toast identity for each successful creation', async () => {
    contactService.createContact.mockResolvedValue(createdContact);
    component.openAddDialog();
    await component.saveContact(validFormValue());
    fixture.detectChanges();
    const firstToast = component.successToast();
    const firstElement = fixture.nativeElement.querySelector('app-toast');

    component.openAddDialog();
    await component.saveContact(validFormValue());
    fixture.detectChanges();

    expect(component.successToast()?.id).not.toBe(firstToast?.id);
    expect(fixture.nativeElement.querySelector('app-toast')).not.toBe(firstElement);
  });

  it('does not let a stale dismissal clear the current toast', async () => {
    contactService.createContact.mockResolvedValue(createdContact);
    component.openAddDialog();
    await component.saveContact(validFormValue());
    const firstToastId = component.successToast()!.id;

    component.openAddDialog();
    await component.saveContact(validFormValue());
    const currentToast = component.successToast();
    component.dismissToast(firstToastId);

    expect(component.successToast()).toBe(currentToast);
  });

  function validFormValue() {
    return {
      name: 'Anna Schmidt',
      email: 'anna@example.com',
      phone: '+49123456789',
    };
  }
});
