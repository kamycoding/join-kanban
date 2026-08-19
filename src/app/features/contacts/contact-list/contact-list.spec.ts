import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from '../../../models/contact';
import { ContactList } from './contact-list';

describe('ContactList', () => {
  let component: ContactList;
  let fixture: ComponentFixture<ContactList>;

  const contacts: Contact[] = [
    {
      id: '1',
      created_at: '2026-08-18T00:00:00.000Z',
      first_name: 'Anna',
      last_name: 'Schmidt',
      email: 'anna@example.com',
      phone: '+49123456789',
      color: '#ff7a00',
      updated_at: '2026-08-18T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactList],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactList);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('contacts', contacts);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
