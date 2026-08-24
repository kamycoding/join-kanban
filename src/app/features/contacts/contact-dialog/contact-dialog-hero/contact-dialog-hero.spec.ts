import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactDialogHero } from './contact-dialog-hero';

describe('ContactDialogHero', () => {
  let component: ContactDialogHero;
  let fixture: ComponentFixture<ContactDialogHero>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactDialogHero],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactDialogHero);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('state', { mode: 'add' });
    fixture.detectChanges();
  });

  it('renders the Add contact presentation', () => {
    expect(fixture.nativeElement.textContent).toContain('Add contact');
    expect(component.initials).toBe('');
  });

  it('emits close from the close button', () => {
    let closeCount = 0;
    component.close.subscribe(() => closeCount++);

    fixture.nativeElement.querySelector('button').click();

    expect(closeCount).toBe(1);
  });
});
