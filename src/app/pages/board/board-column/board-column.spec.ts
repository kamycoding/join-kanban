import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskWithDetails } from '../../../models/task';
import { BoardColumn } from './board-column';

describe('BoardColumn', () => {
  let fixture: ComponentFixture<BoardColumn>;

  const task: TaskWithDetails = {
    id: 'task-1',
    owner_id: 'owner-1',
    title: 'Write the board tests',
    description: '',
    due_date: '2026-09-01',
    priority: 'medium',
    category: 'technical_task',
    status: 'todo',
    position: 0,
    created_at: '2026-08-26T00:00:00.000Z',
    updated_at: '2026-08-26T00:00:00.000Z',
    subtasks: [],
    assignees: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BoardColumn] }).compileComponents();

    fixture = TestBed.createComponent(BoardColumn);
    fixture.componentRef.setInput('heading', 'To do');
    fixture.componentRef.setInput('tasks', []);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the empty state when there is no task', () => {
    const empty = fixture.nativeElement.querySelector('.board-column__empty');

    expect(empty?.textContent?.trim()).toBe('No tasks To do');
  });

  it('renders one card per task instead of the empty state', async () => {
    fixture.componentRef.setInput('tasks', [task]);
    fixture.detectChanges();
    await fixture.whenStable();

    const cards = fixture.nativeElement.querySelectorAll('.board-task');

    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Write the board tests');
    expect(fixture.nativeElement.querySelector('.board-column__empty')).toBeNull();
  });

  it('emits addRequested when the plus button is clicked', () => {
    let emitted = 0;
    fixture.componentInstance.addRequested.subscribe(() => (emitted += 1));

    fixture.nativeElement.querySelector('.board-column__add').click();

    expect(emitted).toBe(1);
  });
});
