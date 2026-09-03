import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import { TaskDetail } from '../../features/tasks/task-detail/task-detail';
import { TaskEdit } from '../../features/tasks/task-edit/task-edit';
import { TaskStatus, TaskWithDetails } from '../../models/task';
import type { Contact } from '../../models/contact';
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
    applySubtaskChange: ReturnType<typeof vi.fn>;
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
      applySubtaskChange: vi.fn(),
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

    await TestBed.configureTestingModule({ imports: [Board] })
      .overrideProvider(TaskService, { useValue: taskService })
      .overrideProvider(SubtaskService, { useValue: subtaskService })
      .overrideProvider(TaskAssigneeService, { useValue: taskAssigneeService })
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

  function detailElement() {
    return fixture.debugElement.query(By.directive(TaskDetail));
  }

  function editElement() {
    return fixture.debugElement.query(By.directive(TaskEdit));
  }
});
