import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { Contact } from '../../../../models/contact';
import { AssignedContacts } from './assigned-contacts';

describe('AssignedContacts', () => {
  let component: AssignedContacts;
  let fixture: ComponentFixture<AssignedContacts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AssignedContacts] }).compileComponents();
    fixture = TestBed.createComponent(AssignedContacts);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('contacts', [createContact()]);
    fixture.componentRef.setInput('selectedIds', []);
    fixture.componentRef.setInput('labelledBy', 'assigned-label');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('selects a contact through a native pressed button', async () => {
    const emitted = vi.fn();
    component.selectionChange.subscribe(emitted);
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    const option = fixture.nativeElement.querySelector('.contact-select__option');
    expect(option.getAttribute('role')).toBeNull();
    expect(option.getAttribute('aria-pressed')).toBe('false');
    option.click();
    expect(emitted).toHaveBeenCalledWith(['contact-1']);
  });

  it('uses disclosure and labelled group semantics', async () => {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    const menu = fixture.nativeElement.querySelector('.contact-select__menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(component.menuId);
    expect(menu.getAttribute('role')).toBe('group');
    expect(menu.getAttribute('aria-labelledby')).toBe('assigned-label');
  });

  it('closes on an outside click', () => {
    component.toggleDropdown();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(component.open()).toBe(false);
  });

  it('closes with Escape and restores focus to the trigger', async () => {
    component.toggleDropdown();
    fixture.detectChanges();
    await fixture.whenStable();
    const option = fixture.nativeElement.querySelector('.contact-select__option');
    option.focus();

    option.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    expect(component.open()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('closes when disabled', async () => {
    component.toggleDropdown();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.open()).toBe(false);
  });

  it('does not select or open while disabled', () => {
    const emitted = vi.fn();
    component.selectionChange.subscribe(emitted);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    component.toggleDropdown();
    component.toggleContact('contact-1');

    expect(component.open()).toBe(false);
    expect(emitted).not.toHaveBeenCalled();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.contact-select__trigger') as HTMLButtonElement;
  }
});

function createContact(): Contact {
  return {
    id: 'contact-1',
    created_at: '2026-08-25T00:00:00.000Z',
    first_name: 'Anna',
    last_name: 'Weber',
    email: 'anna@example.de',
    phone: '+49 151 1234567',
    color: '#ff7a00',
    updated_at: '2026-08-25T00:00:00.000Z',
  };
}
