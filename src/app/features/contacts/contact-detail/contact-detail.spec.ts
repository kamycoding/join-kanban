import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from '../../../models/contact';
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
});
