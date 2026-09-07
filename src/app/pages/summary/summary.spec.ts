import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { TaskPriority, TaskStatus, TaskWithDetails } from '../../models/task';
import { TaskService } from '../../services/task';
import { Summary } from './summary';

describe('Summary', () => {
  let component: Summary;
  let fixture: ComponentFixture<Summary>;
  let tasks: WritableSignal<TaskWithDetails[]>;
  let taskService: {
    tasks: typeof tasks;
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    getTasks: ReturnType<typeof vi.fn>;
  };

  function createTask(
    id: string,
    status: TaskStatus,
    priority: TaskPriority = 'medium',
  ): TaskWithDetails {
    return {
      id,
      owner_id: 'owner-1',
      title: 'A task',
      description: '',
      due_date: '2026-09-01',
      priority,
      category: 'user_story',
      status,
      position: 0,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
      subtasks: [],
      assignees: [],
    };
  }

  /** The numbers of the six cards, in the order the design shows them. */
  function renderedNumbers(): string[] {
    return [...fixture.nativeElement.querySelectorAll('.summary__number')].map(
      (element: HTMLElement) => element.textContent?.trim() ?? '',
    );
  }

  beforeEach(async () => {
    tasks = signal<TaskWithDetails[]>([]);
    taskService = {
      tasks,
      loading: signal(false),
      error: signal<string | null>(null),
      getTasks: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Summary],
      providers: [provideRouter([])],
    })
      .overrideProvider(TaskService, { useValue: taskService })
      .compileComponents();

    fixture = TestBed.createComponent(Summary);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the headline', () => {
    const title = fixture.nativeElement.querySelector('h1');

    expect(title.textContent).toContain('Join 360');
  });

  it('loads the tasks once when it starts', () => {
    expect(taskService.getTasks).toHaveBeenCalledTimes(1);
  });

  it('counts zero on every card while there are no tasks', () => {
    expect(renderedNumbers()).toEqual(['0', '0', '0', '0', '0', '0']);
  });

  it('counts the tasks per status, in total and by urgency', async () => {
    tasks.set([
      createTask('1', 'todo', 'urgent'),
      createTask('2', 'todo'),
      createTask('3', 'in_progress', 'urgent'),
      createTask('4', 'await_feedback'),
      createTask('5', 'done'),
      createTask('6', 'done'),
      createTask('7', 'done'),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // To-do, Done, Urgent, Tasks in Board, In Progress, Awaiting Feedback
    expect(renderedNumbers()).toEqual(['2', '3', '2', '7', '1', '1']);
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

  it('replaces the cards with a notice while the tasks are loading', async () => {
    taskService.loading.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.summary__loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.summary__card').length).toBe(0);
  });

  it('shows an error from the service as an alert', async () => {
    taskService.error.set('Tasks could not be loaded');
    fixture.detectChanges();
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector('.summary__error');

    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('Tasks could not be loaded');
  });
});
