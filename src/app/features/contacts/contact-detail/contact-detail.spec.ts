import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Contact } from '../../../models/contact';
import { ContactActionsMenu } from './contact-actions-menu/contact-actions-menu';
import { ContactDetail } from './contact-detail';

describe('ContactDetail', () => {
  let component: ContactDetail;
  let fixture: ComponentFixture<ContactDetail>;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactDetail);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('contact', contact);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('forwards mobile action menu events through its existing outputs', () => {
    const edited: Contact[] = [];
    const deleted: Contact[] = [];
    const menu = fixture.debugElement.query(By.directive(ContactActionsMenu))
      .componentInstance as ContactActionsMenu;
    component.editContact.subscribe((value) => edited.push(value));
    component.deleteContact.subscribe((value) => deleted.push(value));

    menu.editContact.emit(contact);
    menu.deleteContact.emit(contact);

    expect(edited).toEqual([contact]);
    expect(deleted).toEqual([contact]);
  });
});
