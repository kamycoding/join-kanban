import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { vi } from 'vitest';

import { TaskStatus, TaskWithDetails } from '../../models/task';
import { SubtaskService } from '../../services/subtask';
import { TaskService } from '../../services/task';
import { Board } from './board';

describe('Board', () => {
  let component: Board;
  let fixture: ComponentFixture<Board>;
  let tasks: WritableSignal<TaskWithDetails[]>;
  let taskService: {
    tasks: typeof tasks;
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    getTasks: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    moveTask: ReturnType<typeof vi.fn>;
    applySubtaskChange: ReturnType<typeof vi.fn>;
  };
  let subtaskService: { setSubtaskCompleted: ReturnType<typeof vi.fn> };

  function createTask(id: string, title: string, status: TaskStatus): TaskWithDetails {
    return {
      id,
      owner_id: 'owner-1',
      title,
      description: '',
      due_date: '2026-09-01',
      priority: 'medium',
      category: 'user_story',
      status,
      position: 0,
      created_at: '2026-08-26T00:00:00.000Z',
      updated_at: '2026-08-26T00:00:00.000Z',
      subtasks: [],
      assignees: [],
    };
  }

  beforeEach(async () => {
    tasks = signal<TaskWithDetails[]>([]);
    taskService = {
      tasks,
      loading: signal(false),
      error: signal<string | null>(null),
      getTasks: vi.fn().mockResolvedValue(true),
      deleteTask: vi.fn().mockResolvedValue(true),
      moveTask: vi.fn().mockResolvedValue(null),
      applySubtaskChange: vi.fn(),
    };
    subtaskService = { setSubtaskCompleted: vi.fn().mockResolvedValue(null) };

    await TestBed.configureTestingModule({ imports: [Board] })
      .overrideProvider(TaskService, { useValue: taskService })
      .overrideProvider(SubtaskService, { useValue: subtaskService })
      .compileComponents();

    fixture = TestBed.createComponent(Board);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the tasks once when it starts', () => {
    expect(taskService.getTasks).toHaveBeenCalledTimes(1);
  });

  it('renders one column per status', () => {
    const columns = fixture.nativeElement.querySelectorAll('app-board-column');

    expect(columns.length).toBe(4);
  });

  it('puts every task into the column of its status', async () => {
    tasks.set([
      createTask('task-1', 'Plan the sprint', 'todo'),
      createTask('task-2', 'Build the board', 'in_progress'),
      createTask('task-3', 'Check the layout', 'in_progress'),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tasksFor('todo').map((task) => task.id)).toEqual(['task-1']);
    expect(component.tasksFor('in_progress').map((task) => task.id)).toEqual(['task-2', 'task-3']);
    expect(component.tasksFor('await_feedback')).toEqual([]);
    expect(component.tasksFor('done')).toEqual([]);
  });

  it('saves a status change through the task service, appended to the target column', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task, createTask('task-2', 'Ship the board', 'done')]);
    fixture.detectChanges();
    await fixture.whenStable();

    await component.moveTask({ task, status: 'done' });

    expect(taskService.moveTask).toHaveBeenCalledWith('task-1', 'done', 1);
  });

  it('saves a drop inside the same column as a reorder', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task, createTask('task-2', 'Ship the board', 'todo')]);
    fixture.detectChanges();
    await fixture.whenStable();

    await component.moveTask({ task, status: 'todo', position: 1 });

    expect(taskService.moveTask).toHaveBeenCalledWith('task-1', 'todo', 1);
  });

  it('ignores a task that lands on the slot it already sits in', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task]);
    fixture.detectChanges();
    await fixture.whenStable();

    await component.moveTask({ task, status: 'todo', position: 0 });

    expect(taskService.moveTask).not.toHaveBeenCalled();
  });

  it('offers only the neighbouring columns in the move menu', () => {
    const asPairs = (status: TaskStatus) =>
      component.moveTargetsFor(status).map((target) => [target.status, target.direction]);

    expect(asPairs('todo')).toEqual([['in_progress', 'down']]);
    expect(asPairs('in_progress')).toEqual([
      ['todo', 'up'],
      ['await_feedback', 'down'],
    ]);
    expect(asPairs('done')).toEqual([['await_feedback', 'up']]);
  });

  it('shows the error message when a move fails', async () => {
    taskService.error.set('Task could not be moved.');
    fixture.detectChanges();
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector('.board-page__error');

    expect(alert?.textContent).toContain('Task could not be moved.');
  });

  it('shows the error message when loading fails', async () => {
    taskService.error.set('Tasks could not be loaded.');
    fixture.detectChanges();
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector('.board-page__error');

    expect(alert?.textContent).toContain('Tasks could not be loaded.');
  });
});
