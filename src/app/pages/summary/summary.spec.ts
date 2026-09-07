import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Summary } from './summary';

describe('Summary', () => {
  let component: Summary;
  let fixture: ComponentFixture<Summary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Summary],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Summary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the headline', () => {
    const title = fixture.nativeElement.querySelector('h1');

    expect(title.textContent).toContain('Join 360');
  });

  it('labels every metric', () => {
    const labels = [...fixture.nativeElement.querySelectorAll('.summary__label')].map(
      (label: HTMLElement) => label.textContent?.trim(),
    );

    expect(labels).toEqual([
      'To-do',
      'Done',
      'Urgent',
      'Upcoming Deadline',
      'Tasks in Board',
      'Tasks In Progress',
      'Awaiting Feedback',
    ]);
  });

  it('links all six cards to the board', () => {
    const cards = [...fixture.nativeElement.querySelectorAll('a.summary__card')];

    expect(cards.length).toBe(6);
    expect(cards.every((card: HTMLAnchorElement) => card.getAttribute('href') === '/board')).toBe(
      true,
    );
  });
});
