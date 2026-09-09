import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { TaskPriority, TaskStatus, TaskWithDetails } from '../../models/task';
import { AuthService } from '../../services/auth';
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
  let isGuest: WritableSignal<boolean>;
  let user: WritableSignal<{ user_metadata: Record<string, unknown> } | null>;

  function createTask(
    id: string,
    status: TaskStatus,
    priority: TaskPriority = 'medium',
    due_date = '2026-09-01',
  ): TaskWithDetails {
    return {
      id,
      owner_id: 'owner-1',
      title: 'A task',
      description: '',
      due_date,
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

  /** The greeting under the metrics, its two lines joined by a space. */
  function greetingText(fixtureToRead = fixture): string {
    return [...fixtureToRead.nativeElement.querySelectorAll('.summary__greeting span')]
      .map((line: HTMLElement) => line.textContent?.trim() ?? '')
      .join(' ');
  }

  /** A second component, built after the clock was moved. */
  function renderAgain(): ComponentFixture<Summary> {
    const later = TestBed.createComponent(Summary);
    later.detectChanges();

    return later;
  }

  /** The line above "Upcoming Deadline" on the urgency card. */
  function deadlineText(): string {
    return fixture.nativeElement.querySelector('.summary__date').textContent?.trim() ?? '';
  }

  async function withTasks(...list: TaskWithDetails[]): Promise<void> {
    tasks.set(list);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    // Only Date is faked; faking timers as well would stall whenStable().
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 8, 9, 0, 0));

    tasks = signal<TaskWithDetails[]>([]);
    isGuest = signal(true);
    user = signal<{ user_metadata: Record<string, unknown> } | null>(null);
    taskService = {
      tasks,
      loading: signal(false),
      error: signal<string | null>(null),
      getTasks: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Summary],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isGuest, user } as unknown as AuthService },
      ],
    })
      .overrideProvider(TaskService, { useValue: taskService })
      .compileComponents();

    fixture = TestBed.createComponent(Summary);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('says so while no task is due', () => {
    expect(deadlineText()).toBe('No upcoming deadline');
  });

  it('ignores due dates that have passed', async () => {
    await withTasks(createTask('1', 'todo', 'medium', '2026-09-07'));

    expect(deadlineText()).toBe('No upcoming deadline');
  });

  it('ignores tasks that are done', async () => {
    await withTasks(createTask('1', 'done', 'medium', '2026-10-16'));

    expect(deadlineText()).toBe('No upcoming deadline');
  });

  it('counts a task due today as upcoming', async () => {
    await withTasks(createTask('1', 'todo', 'medium', '2026-09-08'));

    expect(deadlineText()).toBe('September 8, 2026');
  });

  it('shows the earliest date still ahead', async () => {
    await withTasks(
      createTask('1', 'todo', 'medium', '2026-11-02'),
      createTask('2', 'in_progress', 'medium', '2026-10-16'),
      createTask('3', 'await_feedback', 'medium', '2026-08-01'),
      createTask('4', 'done', 'medium', '2026-09-09'),
    );

    expect(deadlineText()).toBe('October 16, 2026');
  });

  it('greets a guest without a name', () => {
    expect(greetingText()).toBe('Good morning!');
  });

  it('greets a signed-in user by name', async () => {
    isGuest.set(false);
    user.set({ user_metadata: { name: 'Sofia Müller' } });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(greetingText()).toBe('Good morning, Sofia Müller');
  });

  it('falls back to the other name keys a profile may carry', async () => {
    isGuest.set(false);
    user.set({ user_metadata: { name: '  ', full_name: 'Björn Daigger' } });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(greetingText()).toBe('Good morning, Björn Daigger');
  });

  it('drops the name when the profile carries none', async () => {
    isGuest.set(false);
    user.set({ user_metadata: {} });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(greetingText()).toBe('Good morning!');
  });

  it('greets by the time of day', () => {
    vi.setSystemTime(new Date(2026, 8, 8, 13, 0, 0));
    expect(greetingText(renderAgain())).toBe('Good afternoon!');

    vi.setSystemTime(new Date(2026, 8, 8, 19, 0, 0));
    expect(greetingText(renderAgain())).toBe('Good evening!');
  });
});
