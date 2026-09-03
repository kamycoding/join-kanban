import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import type { Contact } from '../../../models/contact';
import type { Subtask, Task, TaskWithDetails } from '../../../models/task';
import { ContactService } from '../../../services/contact';
import { SubtaskService } from '../../../services/subtask';
import { TaskAssigneeService } from '../../../services/task-assignee';
import { TaskService } from '../../../services/task';
import { TaskForm } from '../task-form/task-form';
import { toTaskFormValue } from '../task-form/task-form-edit-mapper';
import { TaskEdit } from './task-edit';

describe('TaskEdit', () => {
  let component: TaskEdit;
  let fixture: ComponentFixture<TaskEdit>;
  let task: TaskWithDetails;
  let taskError: WritableSignal<string | null>;
  let assigneeError: WritableSignal<string | null>;
  let subtaskError: WritableSignal<string | null>;
  let taskService: {
    error: WritableSignal<string | null>;
    updateTask: ReturnType<typeof vi.fn>;
    getTasks: ReturnType<typeof vi.fn>;
  };
  let taskAssigneeService: {
    error: WritableSignal<string | null>;
    assignContact: ReturnType<typeof vi.fn>;
    removeContact: ReturnType<typeof vi.fn>;
  };
  let subtaskService: {
    error: WritableSignal<string | null>;
    createSubtask: ReturnType<typeof vi.fn>;
    updateSubtask: ReturnType<typeof vi.fn>;
    deleteSubtask: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    task = createTaskFixture();
    taskError = signal<string | null>(null);
    assigneeError = signal<string | null>(null);
    subtaskError = signal<string | null>(null);
    taskService = {
      error: taskError,
      updateTask: vi.fn().mockResolvedValue(createTaskEntity()),
      getTasks: vi.fn().mockResolvedValue(true),
    };
    taskAssigneeService = {
      error: assigneeError,
      assignContact: vi.fn().mockResolvedValue({}),
      removeContact: vi.fn().mockResolvedValue(true),
    };
    subtaskService = {
      error: subtaskError,
      createSubtask: vi.fn().mockResolvedValue({}),
      updateSubtask: vi.fn().mockResolvedValue({}),
      deleteSubtask: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({ imports: [TaskEdit] })
      .overrideProvider(ContactService, {
        useValue: {
          contacts: signal<Contact[]>([createContact('contact-1'), createContact('contact-2')]),
          getContacts: vi.fn().mockResolvedValue(undefined),
        },
      })
      .overrideProvider(TaskService, { useValue: taskService })
      .overrideProvider(TaskAssigneeService, { useValue: taskAssigneeService })
      .overrideProvider(SubtaskService, { useValue: subtaskService })
      .compileComponents();

    fixture = TestBed.createComponent(TaskEdit);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('prefills the form with the current task data', () => {
    const childForm = childTaskForm();

    expect(childForm.formModel()).toMatchObject({
      title: 'Original title',
      description: 'Original description',
      dueDate: '2099-01-15',
      priority: 'medium',
      category: 'user_story',
      contactIds: ['contact-1', 'contact-2'],
      subtasks: [
        { kind: 'existing', id: 'subtask-1', title: 'Existing one', isCompleted: true },
        { kind: 'existing', id: 'subtask-2', title: 'Existing two', isCompleted: false },
      ],
    });
    expect(childForm.mode()).toBe('edit');
  });

  it('does not mutate the task it edits', () => {
    const snapshot = structuredClone(task);

    childTaskForm().formModel.set(editedDraft());

    expect(task).toEqual(snapshot);
  });

  it('cancels without any persistence calls', () => {
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    component.cancel();

    expect(cancelled).toHaveBeenCalledOnce();
    expect(taskService.updateTask).not.toHaveBeenCalled();
    expect(taskService.getTasks).not.toHaveBeenCalled();
    expect(taskAssigneeService.assignContact).not.toHaveBeenCalled();
    expect(taskAssigneeService.removeContact).not.toHaveBeenCalled();
    expect(subtaskService.createSubtask).not.toHaveBeenCalled();
    expect(subtaskService.updateSubtask).not.toHaveBeenCalled();
    expect(subtaskService.deleteSubtask).not.toHaveBeenCalled();
  });

  it('cancels from the backdrop without persistence', () => {
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    backdrop().dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(cancelled).toHaveBeenCalledOnce();
    expect(taskService.updateTask).not.toHaveBeenCalled();
  });

  it('saves only the changed base fields and refreshes the task state', async () => {
    const saved = vi.fn();
    component.saved.subscribe(saved);

    await component.onSave({ ...toTaskFormValue(task), title: 'Changed title' });

    expect(taskService.updateTask).toHaveBeenCalledWith('task-1', { title: 'Changed title' });
    expect(taskService.updateTask).toHaveBeenCalledTimes(1);
    expect(taskService.getTasks).toHaveBeenCalledTimes(1);
    expect(taskAssigneeService.assignContact).not.toHaveBeenCalled();
    expect(taskAssigneeService.removeContact).not.toHaveBeenCalled();
    expect(subtaskService.createSubtask).not.toHaveBeenCalled();
    expect(subtaskService.updateSubtask).not.toHaveBeenCalled();
    expect(subtaskService.deleteSubtask).not.toHaveBeenCalled();
    expect(saved).toHaveBeenCalledOnce();
  });

  it('saves an unchanged form without any persistence calls', async () => {
    const saved = vi.fn();
    component.saved.subscribe(saved);

    await component.onSave(toTaskFormValue(task));

    expect(taskService.updateTask).not.toHaveBeenCalled();
    expect(taskAssigneeService.assignContact).not.toHaveBeenCalled();
    expect(taskAssigneeService.removeContact).not.toHaveBeenCalled();
    expect(subtaskService.createSubtask).not.toHaveBeenCalled();
    expect(subtaskService.updateSubtask).not.toHaveBeenCalled();
    expect(subtaskService.deleteSubtask).not.toHaveBeenCalled();
    expect(taskService.getTasks).toHaveBeenCalledTimes(1);
    expect(saved).toHaveBeenCalledOnce();
  });

  it('assigns only newly added contacts', async () => {
    await component.onSave({
      ...toTaskFormValue(task),
      contactIds: ['contact-1', 'contact-2', 'contact-3'],
    });

    expect(taskAssigneeService.assignContact).toHaveBeenCalledWith('task-1', 'contact-3');
    expect(taskAssigneeService.assignContact).toHaveBeenCalledTimes(1);
    expect(taskAssigneeService.removeContact).not.toHaveBeenCalled();
  });

  it('removes only unselected contacts', async () => {
    await component.onSave({ ...toTaskFormValue(task), contactIds: ['contact-1'] });

    expect(taskAssigneeService.removeContact).toHaveBeenCalledWith('task-1', 'contact-2');
    expect(taskAssigneeService.removeContact).toHaveBeenCalledTimes(1);
    expect(taskAssigneeService.assignContact).not.toHaveBeenCalled();
  });

  it('creates new subtasks with a position after the existing ones', async () => {
    const draft = toTaskFormValue(task);
    draft.subtasks.push({
      kind: 'new',
      clientId: 'new-subtask-1',
      title: 'Fresh work',
      isCompleted: false,
    });

    await component.onSave(draft);

    expect(subtaskService.createSubtask).toHaveBeenCalledWith({
      task_id: 'task-1',
      title: 'Fresh work',
      position: 2,
    });
    expect(taskService.updateTask).not.toHaveBeenCalled();
  });

  it('renames an existing subtask by id while keeping its completion state', async () => {
    const draft = toTaskFormValue(task);
    draft.subtasks[0] = { ...draft.subtasks[0], title: 'Renamed one' };

    await component.onSave(draft);

    expect(subtaskService.updateSubtask).toHaveBeenCalledTimes(1);
    expect(subtaskService.updateSubtask).toHaveBeenCalledWith('subtask-1', { title: 'Renamed one' });
    expect(subtaskService.deleteSubtask).not.toHaveBeenCalled();
  });

  it('deletes subtasks that were removed from the form', async () => {
    const draft = toTaskFormValue(task);
    draft.subtasks = [draft.subtasks[0]];

    await component.onSave(draft);

    expect(subtaskService.deleteSubtask).toHaveBeenCalledWith('subtask-2');
    expect(subtaskService.deleteSubtask).toHaveBeenCalledTimes(1);
    expect(subtaskService.updateSubtask).not.toHaveBeenCalled();
  });

  it('keeps the editor open and shows the error when the base update fails', async () => {
    const saved = vi.fn();
    component.saved.subscribe(saved);
    taskService.updateTask.mockResolvedValueOnce(null);
    taskError.set('Update failed');

    await component.onSave(editedDraft());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(childTaskForm().error()).toBe('Update failed');
    expect(saved).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.task-edit')).toBeTruthy();
    expect(taskService.getTasks).toHaveBeenCalledTimes(1);
  });

  it('keeps the editor open and reconciles when a subtask operation fails', async () => {
    const saved = vi.fn();
    component.saved.subscribe(saved);
    subtaskService.createSubtask.mockResolvedValueOnce(null);
    subtaskError.set('Subtask could not be created.');
    const draft = toTaskFormValue(task);
    draft.subtasks.push({
      kind: 'new',
      clientId: 'new-subtask-1',
      title: 'Fresh work',
      isCompleted: false,
    });

    await component.onSave(draft);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(childTaskForm().error()).toBe('Subtask could not be created.');
    expect(saved).not.toHaveBeenCalled();
    expect(taskService.getTasks).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate save requests while saving', async () => {
    let release!: (task: Task) => void;
    taskService.updateTask.mockImplementation(
      () =>
        new Promise<Task>((resolve) => {
          release = resolve;
        }),
    );

    const first = component.onSave(editedDraft());
    const second = component.onSave(editedDraft());

    expect(taskService.updateTask).toHaveBeenCalledTimes(1);
    release(createTaskEntity());
    await Promise.all([first, second]);
  });

  it('cancels with Escape without persistence', () => {
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    panelInput().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    expect(cancelled).toHaveBeenCalledOnce();
    expect(taskService.updateTask).not.toHaveBeenCalled();
  });

  function childTaskForm(): TaskForm {
    return fixture.debugElement.query(By.directive(TaskForm)).componentInstance as TaskForm;
  }

  function backdrop(): HTMLElement {
    return fixture.nativeElement.querySelector('.task-edit-backdrop') as HTMLElement;
  }

  function panelInput(): HTMLElement {
    return fixture.nativeElement.querySelector('input') as HTMLElement;
  }
});

function editedDraft() {
  return { ...toTaskFormValue(createTaskFixture()), title: 'Changed title' };
}

function createContact(id: string): Contact {
  return {
    id,
    created_at: '2026-08-25T00:00:00.000Z',
    first_name: 'Anna',
    last_name: 'Weber',
    email: 'anna@example.de',
    phone: '+49 151 1234567',
    color: '#ff7a00',
    updated_at: '2026-08-25T00:00:00.000Z',
  };
}

function createTaskFixture(): TaskWithDetails {
  return {
    id: 'task-1',
    owner_id: 'owner-1',
    title: 'Original title',
    description: 'Original description',
    due_date: '2099-01-15',
    priority: 'medium',
    category: 'user_story',
    status: 'todo',
    position: 0,
    created_at: '2026-08-26T00:00:00.000Z',
    updated_at: '2026-08-26T00:00:00.000Z',
    subtasks: [
      createSubtask('subtask-1', 'Existing one', true, 0),
      createSubtask('subtask-2', 'Existing two', false, 1),
    ],
    assignees: [
      {
        task_id: 'task-1',
        contact_id: 'contact-1',
        created_at: '2026-08-26T00:00:00.000Z',
        contact: createContact('contact-1'),
      },
      {
        task_id: 'task-1',
        contact_id: 'contact-2',
        created_at: '2026-08-26T00:00:00.000Z',
        contact: createContact('contact-2'),
      },
    ],
  };
}

function createSubtask(id: string, title: string, isCompleted: boolean, position: number): Subtask {
  return {
    id,
    task_id: 'task-1',
    title,
    is_completed: isCompleted,
    position,
    created_at: '2026-08-26T00:00:00.000Z',
  };
}

function createTaskEntity(): Task {
  return {
    id: 'task-1',
    owner_id: 'owner-1',
    title: 'Changed title',
    description: 'Original description',
    due_date: '2099-01-15',
    priority: 'medium',
    category: 'user_story',
    status: 'todo',
    position: 0,
    created_at: '2026-08-26T00:00:00.000Z',
    updated_at: '2026-08-26T00:00:00.000Z',
  };
}
