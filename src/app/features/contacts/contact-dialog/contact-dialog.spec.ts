import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from '../../../models/contact';
import { ContactDialog } from './contact-dialog';

describe('ContactDialog', () => {
  let component: ContactDialog;
  let fixture: ComponentFixture<ContactDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactDialog);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('state', { mode: 'add' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with an invalid empty add form', () => {
    expect(component.contactForm().invalid()).toBe(true);
  });

  it('prefills the form when editing a contact', () => {
    const editFixture = TestBed.createComponent(ContactDialog);
    editFixture.componentRef.setInput('state', { mode: 'edit', contact });
    editFixture.detectChanges();

    expect(editFixture.componentInstance.formModel()).toEqual({
      name: 'Anna Schmidt',
      email: contact.email,
      phone: contact.phone,
    });
  });

  it('emits close when Cancel is requested before entrance completes', () => {
    let closeCount = 0;
    component.close.subscribe(() => closeCount++);
    component.dialogEntered.set(false);

    component.requestClose();

    expect(closeCount).toBe(1);
  });

  const contact: Contact = {
    id: '1',
    created_at: '2026-08-18T00:00:00.000Z',
    first_name: 'Anna',
    last_name: 'Schmidt',
    email: 'anna@example.com',
    phone: '+49123456789',
    color: '#ff7a00',
    updated_at: '2026-08-18T00:00:00.000Z',
  };
});
