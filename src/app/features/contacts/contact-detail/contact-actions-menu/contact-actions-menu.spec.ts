import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from '../../../../models/contact';
import { ContactActionsMenu } from './contact-actions-menu';

describe('ContactActionsMenu', () => {
  let component: ContactActionsMenu;
  let fixture: ComponentFixture<ContactActionsMenu>;

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
      imports: [ContactActionsMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactActionsMenu);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('contact', contact);
    fixture.detectChanges();
  });

  it('opens and closes from the trigger', () => {
    const menu = openMenu();

    component.toggleMenu();

    expect(component.menuRendered()).toBe(true);
    expect(component.menuOpen()).toBe(false);

    finishExit(menu);

    expect(component.menuRendered()).toBe(false);
  });

  it('closes and emits the contact for Edit', () => {
    const emitted: Contact[] = [];
    component.editContact.subscribe((value) => emitted.push(value));
    const menu = openMenu();

    component.editCurrentContact();

    expect(component.menuOpen()).toBe(false);
    expect(emitted).toEqual([contact]);

    finishExit(menu);
  });

  it('closes and emits the contact for Delete', () => {
    const emitted: Contact[] = [];
    component.deleteContact.subscribe((value) => emitted.push(value));
    const menu = openMenu();

    component.deleteCurrentContact();

    expect(component.menuOpen()).toBe(false);
    expect(emitted).toEqual([contact]);

    finishExit(menu);
  });

  it('closes on an outside click', () => {
    const menu = openMenu();

    document.body.click();

    expect(component.menuOpen()).toBe(false);
    finishExit(menu);
    expect(component.menuRendered()).toBe(false);
  });

  it('closes when Escape is pressed', () => {
    const menu = openMenu();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.menuOpen()).toBe(false);
    finishExit(menu);
    expect(component.menuRendered()).toBe(false);
  });

  function openMenu(): HTMLElement {
    component.toggleMenu();
    component.menuOpen.set(true);
    fixture.detectChanges();

    return fixture.nativeElement.querySelector('.contact-actions-menu__popup');
  }

  function finishExit(menu: HTMLElement): void {
    menu.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
    fixture.detectChanges();
  }
});
