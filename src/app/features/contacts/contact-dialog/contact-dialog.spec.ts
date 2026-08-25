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

  it.each(['test', 'test@', 'test@test', 'test@test.', 'test@test.a'])(
    'keeps the form invalid for mentor-invalid email %j',
    (email) => {
      setFormValue({ name: 'Anna Weber', email, phone: '123456' });

      expect(component.contactForm.email().invalid()).toBe(true);
      expect(component.contactForm().invalid()).toBe(true);
    },
  );

  it('becomes valid with valid contact data', () => {
    setFormValue({
      name: "Anne-Marie O'Connor",
      email: 'user+tag@sub.example.co.uk',
      phone: '+1 (555) 123-4567',
    });

    expect(component.contactForm().valid()).toBe(true);
  });

  it('rejects a one character name and accepts a two character name', () => {
    setFormValue({ name: 'A', email: 'test@test.de', phone: '123456' });
    expect(component.contactForm.name().invalid()).toBe(true);

    setFormValue({ name: 'Jo', email: 'test@test.de', phone: '123456' });
    expect(component.contactForm.name().valid()).toBe(true);
    expect(component.contactForm().valid()).toBe(true);
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

  it('ignores close requests while saving', () => {
    const close = vi.fn();
    component.close.subscribe(close);
    fixture.componentRef.setInput('saving', true);
    component.dialogEntered.set(false);

    component.requestClose();

    expect(close).not.toHaveBeenCalled();
  });

  it('emits consistently normalized values on valid submit', async () => {
    let submittedValue: unknown;
    component.submitted.subscribe((value) => (submittedValue = value));
    setFormValue({
      name: '  Anna   Weber  ',
      email: '  anna@example.de ',
      phone: ' +49 151 1234567  ',
    });

    await component.onSubmit(submitEvent());

    expect(submittedValue).toEqual({
      name: 'Anna Weber',
      email: 'anna@example.de',
      phone: '+49 151 1234567',
    });
  });

  it('preserves legacy edit values while requiring invalid data to be corrected', () => {
    const editFixture = TestBed.createComponent(ContactDialog);
    editFixture.componentRef.setInput('state', {
      mode: 'edit',
      contact: { ...contact, first_name: 'A', last_name: '', email: 'legacy-address' },
    });
    editFixture.detectChanges();

    expect(editFixture.componentInstance.formModel()).toEqual({
      name: 'A',
      email: 'legacy-address',
      phone: contact.phone,
    });
    expect(editFixture.componentInstance.contactForm().invalid()).toBe(true);
  });

  it('does not emit invalid values on submit', async () => {
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    setFormValue({ name: 'A', email: 'test@test.a', phone: '12345' });

    await component.onSubmit(submitEvent());

    expect(submitted).not.toHaveBeenCalled();
  });

  function setFormValue(value: { name: string; email: string; phone: string }): void {
    component.formModel.set(value);
    fixture.detectChanges();
  }

  function submitEvent(): Event {
    return { preventDefault: vi.fn() } as unknown as Event;
  }

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
