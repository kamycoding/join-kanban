import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import { TaskForm } from '../../features/tasks/task-form/task-form';
import {
  createEmptyTaskFormValue,
  type TaskFormValue,
} from '../../features/tasks/task-form/task-form-value';
import type { Contact } from '../../models/contact';
import type { Task } from '../../models/task';
import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';
import { AddTask } from './add-task';

describe('AddTask', () => {
  let component: AddTask;
  let fixture: ComponentFixture<AddTask>;
  let contacts: WritableSignal<Contact[]>;
  let saving: WritableSignal<boolean>;
  let serviceError: WritableSignal<string | null>;
  let contactService: { contacts: typeof contacts; getContacts: ReturnType<typeof vi.fn> };
  let taskService: {
    saving: typeof saving;
    error: typeof serviceError;
    createTaskWithDetails: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    contacts = signal<Contact[]>([createContact()]);
    saving = signal(false);
    serviceError = signal<string | null>(null);
    contactService = { contacts, getContacts: vi.fn().mockResolvedValue(undefined) };
    taskService = {
      saving,
      error: serviceError,
      createTaskWithDetails: vi.fn().mockResolvedValue(createTask()),
    };

    await TestBed.configureTestingModule({ imports: [AddTask] })
      .overrideProvider(ContactService, { useValue: contactService })
      .overrideProvider(TaskService, { useValue: taskService })
      .compileComponents();

    fixture = TestBed.createComponent(AddTask);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads contacts and renders TaskForm with container state', async () => {
    saving.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const taskForm = childTaskForm();
    expect(contactService.getContacts).toHaveBeenCalledOnce();
    expect(taskForm.contacts()).toEqual(contacts());
    expect(taskForm.busy()).toBe(true);
  });

  it('maps submitted form data to the exact create payload', async () => {
    await component.onSubmitted(formValue());

    expect(taskService.createTaskWithDetails).toHaveBeenCalledWith({
      task: {
        title: 'Build TaskForm',
        description: 'Keep Add Task working',
        due_date: '2099-12-31',
        priority: 'urgent',
        category: 'technical_task',
        status: 'todo',
      },
      contactIds: ['contact-1', 'contact-2'],
      subtasks: [
        { title: 'First subtask', is_completed: false, position: 0 },
        { title: 'Existing subtask', is_completed: true, position: 1 },
      ],
    });
  });

  it('resets TaskForm and shows success feedback only after successful creation', async () => {
    const reset = vi.spyOn(childTaskForm(), 'reset');

    await component.onSubmitted(formValue());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(reset).toHaveBeenCalledOnce();
    expect(component.successToast()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-toast')).toBeTruthy();
  });

  it('preserves user data and does not show success after failed creation', async () => {
    taskService.createTaskWithDetails.mockResolvedValueOnce(null);
    const taskForm = childTaskForm();
    taskForm.formModel.set(formValue());
    const reset = vi.spyOn(taskForm, 'reset');

    await component.onSubmitted(formValue());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(reset).not.toHaveBeenCalled();
    expect(taskForm.formModel()).toMatchObject(formValue());
    expect(component.successToast()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-toast')).toBeNull();
  });

  it('shows the persistence error after a failed creation', async () => {
    taskService.createTaskWithDetails.mockResolvedValueOnce(null);
    taskService.error.set('Creation failed');

    await component.onSubmitted(formValue());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(childTaskForm().error()).toBe('Creation failed');
  });

  it('Clear removes the persistence error and resets the form without another create call', async () => {
    taskService.createTaskWithDetails.mockResolvedValueOnce(null);
    taskService.error.set('Creation failed');
    const taskForm = childTaskForm();
    taskForm.formModel.set(formValue());

    await component.onSubmitted(formValue());
    fixture.detectChanges();
    await fixture.whenStable();
    expect(taskForm.error()).toBe('Creation failed');
    expect(taskService.createTaskWithDetails).toHaveBeenCalledTimes(1);

    taskForm.onSecondaryAction();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(taskForm.error()).toBeNull();
    expect(taskForm.formModel()).toEqual(createEmptyTaskFormValue());
    expect(taskService.createTaskWithDetails).toHaveBeenCalledTimes(1);
    expect(component.successToast()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-toast')).toBeNull();
  });

  function childTaskForm(): TaskForm {
    return fixture.debugElement.query(By.directive(TaskForm)).componentInstance as TaskForm;
  }
});

function formValue(): TaskFormValue {
  return {
    title: '  Build TaskForm  ',
    description: '  Keep Add Task working  ',
    dueDate: '2099-12-31',
    priority: 'urgent',
    category: 'technical_task',
    contactIds: ['contact-1', 'contact-1', 'contact-2'],
    subtasks: [
      {
        kind: 'new',
        clientId: 'new-subtask-1',
        title: '  First subtask  ',
        isCompleted: false,
      },
      {
        kind: 'existing',
        id: 'subtask-1',
        title: '  Existing subtask  ',
        isCompleted: true,
      },
    ],
  };
}

function createContact(): Contact {
  return {
    id: 'contact-1',
    created_at: '2026-08-25T00:00:00.000Z',
    first_name: 'Anna',
    last_name: 'Weber',
    email: 'anna@example.de',
    phone: '+49 151 1234567',
    color: '#ff7a00',
    updated_at: '2026-08-25T00:00:00.000Z',
  };
}

function createTask(): Task {
  return {
    id: 'task-1',
    owner_id: 'user-1',
    title: 'Build TaskForm',
    description: 'Keep Add Task working',
    due_date: '2099-12-31',
    priority: 'urgent',
    category: 'technical_task',
    status: 'todo',
    position: 0,
    created_at: '2026-08-25T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z',
  };
}
