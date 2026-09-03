import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { vi } from 'vitest';

import { Subtask, TaskStatus, TaskWithDetails } from '../../models/task';
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

  it('keeps only the tasks whose title or description match the search', async () => {
    tasks.set([
      createTask('task-1', 'Plan the sprint', 'todo'),
      { ...createTask('task-2', 'Ship the board', 'todo'), description: 'Plan the rollout' },
      createTask('task-3', 'Check the layout', 'in_progress'),
    ]);
    await search('plan');

    expect(component.tasksFor('todo').map((task) => task.id)).toEqual(['task-1', 'task-2']);
    expect(component.tasksFor('in_progress')).toEqual([]);
  });

  it('ignores case and surrounding blanks in the search', async () => {
    tasks.set([createTask('task-1', 'Plan the sprint', 'todo')]);
    await search('  PLAN  ');

    expect(component.tasksFor('todo').map((task) => task.id)).toEqual(['task-1']);
  });

  it('shows every task again once the search is emptied', async () => {
    tasks.set([createTask('task-1', 'Plan the sprint', 'todo')]);
    await search('nothing matches this');

    expect(component.tasksFor('todo')).toEqual([]);

    await search('');

    expect(component.tasksFor('todo').map((task) => task.id)).toEqual(['task-1']);
  });

  it('appends to the end of the whole column, not of the filtered one', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([
      task,
      createTask('task-2', 'Ship the board', 'done'),
      createTask('task-3', 'Check the layout', 'done'),
    ]);
    await search('plan');

    expect(component.tasksFor('done')).toEqual([]);

    await component.moveTask({ task, status: 'done' });

    expect(taskService.moveTask).toHaveBeenCalledWith('task-1', 'done', 2);
  });

  it('turns dragging off while the board is filtered', async () => {
    expect(component.dragDisabled()).toBe(false);

    await search('plan');

    expect(component.dragDisabled()).toBe(true);

    await search('   ');

    expect(component.dragDisabled()).toBe(false);
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

  it('opens the detail overlay for a task', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-task-detail')).toBeNull();

    component.openDetail(task);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedTask()).toEqual(task);
    expect(fixture.nativeElement.querySelector('app-task-detail')).not.toBeNull();
  });

  it('closes the detail overlay', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task]);
    component.openDetail(task);
    fixture.detectChanges();
    await fixture.whenStable();

    component.closeDetail();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedTask()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-task-detail')).toBeNull();
  });

  it('follows the task while the overlay is open', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task]);
    component.openDetail(task);
    fixture.detectChanges();
    await fixture.whenStable();

    tasks.set([{ ...task, title: 'Plan the next sprint' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedTask()?.title).toBe('Plan the next sprint');
  });

  it('closes the overlay when its task leaves the list', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task]);
    component.openDetail(task);
    fixture.detectChanges();
    await fixture.whenStable();

    tasks.set([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedTask()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-task-detail')).toBeNull();
  });

  it('deletes a task and closes the overlay', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    tasks.set([task]);
    component.openDetail(task);
    fixture.detectChanges();
    await fixture.whenStable();

    await component.deleteTask(task);

    expect(taskService.deleteTask).toHaveBeenCalledWith('task-1');
    expect(component.selectedTaskId()).toBeNull();
  });

  it('keeps the overlay open when the task could not be deleted', async () => {
    const task = createTask('task-1', 'Plan the sprint', 'todo');
    taskService.deleteTask.mockResolvedValue(false);
    tasks.set([task]);
    component.openDetail(task);
    fixture.detectChanges();
    await fixture.whenStable();

    await component.deleteTask(task);

    expect(component.selectedTaskId()).toBe('task-1');
    expect(fixture.nativeElement.querySelector('app-task-detail')).not.toBeNull();
  });

  it('hands a saved subtask back to the task service', async () => {
    const subtask = createSubtask('subtask-1', true);
    subtaskService.setSubtaskCompleted.mockResolvedValue(subtask);

    await component.toggleSubtask({ subtaskId: 'subtask-1', isCompleted: true });

    expect(subtaskService.setSubtaskCompleted).toHaveBeenCalledWith('subtask-1', true);
    expect(taskService.applySubtaskChange).toHaveBeenCalledWith(subtask);
  });

  it('leaves the tasks alone when the subtask could not be saved', async () => {
    await component.toggleSubtask({ subtaskId: 'subtask-1', isCompleted: true });

    expect(subtaskService.setSubtaskCompleted).toHaveBeenCalledWith('subtask-1', true);
    expect(taskService.applySubtaskChange).not.toHaveBeenCalled();
  });

  function createSubtask(id: string, isCompleted: boolean): Subtask {
    return {
      id,
      task_id: 'task-1',
      title: 'Write the test',
      is_completed: isCompleted,
      position: 0,
      created_at: '2026-08-26T00:00:00.000Z',
    };
  }

  /**
   * Types into the real search field, so the template is part of the test
   * instead of only the signal behind it.
   */
  async function search(term: string): Promise<void> {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.board-search__input');
    input.value = term;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }
});
