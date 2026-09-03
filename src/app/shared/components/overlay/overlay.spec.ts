import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Overlay } from './overlay';

describe('Overlay', () => {
  let fixture: ComponentFixture<Overlay>;
  let closed: number;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Overlay] }).compileComponents();

    fixture = TestBed.createComponent(Overlay);
    fixture.componentRef.setInput('heading', 'Add Task');
    fixture.detectChanges();
    await fixture.whenStable();

    closed = 0;
    fixture.componentInstance.closeRequested.subscribe(() => (closed += 1));
  });

  it('names the dialog by its heading', () => {
    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    const heading: HTMLElement = fixture.nativeElement.querySelector('.overlay__heading');

    expect(heading.textContent).toContain('Add Task');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('closes on the close button', () => {
    fixture.nativeElement.querySelector('.overlay__close').click();

    expect(closed).toBe(1);
  });

  it('closes on a click on the backdrop', () => {
    fixture.nativeElement.querySelector('.overlay__backdrop').click();

    expect(closed).toBe(1);
  });

  it('stays open when the click came from inside the dialog', () => {
    fixture.nativeElement.querySelector('.overlay__body').click();

    expect(closed).toBe(0);
  });

  it('closes on Escape', () => {
    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toBe(1);
  });
});
