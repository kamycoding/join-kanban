import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { TaskDetail } from '../../features/tasks/task-detail/task-detail';
import { TaskEdit } from '../../features/tasks/task-edit/task-edit';
import type { Contact } from '../../models/contact';
import { TaskStatus, TaskWithDetails } from '../../models/task';
import { ContactService } from '../../services/contact';
import { SubtaskService } from '../../services/subtask';
import { TaskAssigneeService } from '../../services/task-assignee';
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
    saving: WritableSignal<boolean>;
    createTaskWithDetails: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
  };
  let subtaskService: {
    error: WritableSignal<string | null>;
    setSubtaskCompleted: ReturnType<typeof vi.fn>;
    createSubtask: ReturnType<typeof vi.fn>;
    updateSubtask: ReturnType<typeof vi.fn>;
    deleteSubtask: ReturnType<typeof vi.fn>;
  };
  let taskAssigneeService: {
    error: WritableSignal<string | null>;
    assignContact: ReturnType<typeof vi.fn>;
    removeContact: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let windowWidth: number;

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
      saving: signal(false),
      createTaskWithDetails: vi.fn().mockResolvedValue(null),
      updateTask: vi.fn().mockResolvedValue(null),
    };
    subtaskService = {
      error: signal<string | null>(null),
      setSubtaskCompleted: vi.fn().mockResolvedValue(null),
      createSubtask: vi.fn().mockResolvedValue(null),
      updateSubtask: vi.fn().mockResolvedValue(null),
      deleteSubtask: vi.fn().mockResolvedValue(false),
    };
    taskAssigneeService = {
      error: signal<string | null>(null),
      assignContact: vi.fn().mockResolvedValue(null),
      removeContact: vi.fn().mockResolvedValue(false),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    windowWidth = 1440;
    vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => windowWidth);

    await TestBed.configureTestingModule({ imports: [Board] })
      .overrideProvider(TaskService, { useValue: taskService })
      .overrideProvider(SubtaskService, { useValue: subtaskService })
      .overrideProvider(TaskAssigneeService, { useValue: taskAssigneeService })
      .overrideProvider(Router, { useValue: router })
      .overrideProvider(ContactService, {
        useValue: {
          contacts: signal<Contact[]>([]),
          getContacts: vi.fn().mockResolvedValue(undefined),
        },
      })
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

  it('opens the task form for the column that was clicked', async () => {
    expect(fixture.nativeElement.querySelector('app-overlay')).toBeNull();

    await component.openForm('await_feedback');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.formStatus()).toBe('await_feedback');
    expect(fixture.nativeElement.querySelector('app-overlay app-add-task')).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('goes to the Add-task page instead of opening an overlay on a narrow screen', async () => {
    windowWidth = 500;

    await component.openForm('done');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/add-task'], {
      queryParams: { status: 'done' },
    });
    expect(component.formStatus()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-overlay')).toBeNull();
  });

  it('opens the form from the Add-task button in the heading', async () => {
    fixture.nativeElement.querySelector('.board-heading__add').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.formStatus()).toBe('todo');
  });

  it('closes the form and confirms once a task was created', async () => {
    await component.openForm('todo');
    fixture.detectChanges();
    await fixture.whenStable();

    component.onTaskCreated();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.formStatus()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-overlay')).toBeNull();
    expect(fixture.nativeElement.querySelector('.board-page__toast')).not.toBeNull();
  });

  it('closes the form without a confirmation when it was cancelled', async () => {
    await component.openForm('todo');
    fixture.detectChanges();
    await fixture.whenStable();

    component.closeForm();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.formStatus()).toBeNull();
    expect(fixture.nativeElement.querySelector('.board-page__toast')).toBeNull();
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

  it('opens the edit form from the task detail and hides the detail', async () => {
    tasks.set([createTask('task-1', 'Plan the sprint', 'todo')]);
    component.openDetail(tasks()[0]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(detailElement()).toBeTruthy();

    detailElement().componentInstance.editRequested.emit(tasks()[0]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(detailElement()).toBeNull();
    expect(editElement()).toBeTruthy();
    expect(editElement().componentInstance.task().id).toBe('task-1');
  });

  it('returns to the task detail when the edit is cancelled', async () => {
    tasks.set([createTask('task-1', 'Plan the sprint', 'todo')]);
    component.openDetail(tasks()[0]);
    fixture.detectChanges();
    await fixture.whenStable();
    detailElement().componentInstance.editRequested.emit(tasks()[0]);
    fixture.detectChanges();
    await fixture.whenStable();

    editElement().componentInstance.cancelled.emit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(editElement()).toBeNull();
    expect(detailElement()).toBeTruthy();
    expect(taskService.getTasks).toHaveBeenCalledTimes(1);
  });

  it('returns to the updated task detail after a successful edit save', async () => {
    tasks.set([createTask('task-1', 'Plan the sprint', 'todo')]);
    component.openDetail(tasks()[0]);
    fixture.detectChanges();
    await fixture.whenStable();
    detailElement().componentInstance.editRequested.emit(tasks()[0]);
    fixture.detectChanges();
    await fixture.whenStable();

    tasks.set([createTask('task-1', 'Renamed sprint plan', 'todo')]);
    editElement().componentInstance.saved.emit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(editElement()).toBeNull();
    const detail = detailElement();
    expect(detail).toBeTruthy();
    expect(
      (detail!.nativeElement as HTMLElement).querySelector('.task-detail__title')?.textContent,
    ).toContain('Renamed sprint plan');
  });

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

  function detailElement() {
    return fixture.debugElement.query(By.directive(TaskDetail));
  }

  function editElement() {
    return fixture.debugElement.query(By.directive(TaskEdit));
  }
});
