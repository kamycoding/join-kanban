import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
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
  let router: { navigate: ReturnType<typeof vi.fn> };

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
    router = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({ imports: [AddTask] })
      .overrideProvider(ContactService, { useValue: contactService })
      .overrideProvider(TaskService, { useValue: taskService })
      .overrideProvider(Router, { useValue: router })
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

  it('creates the task in the column it was handed', async () => {
    fixture.componentRef.setInput('status', 'await_feedback');
    await fillRequiredFields();

    await submit();

    expect(taskService.createTaskWithDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.objectContaining({ status: 'await_feedback', title: 'Write the docs' }),
      }),
    );
  });

  it('defaults to the To-do column as a routed page', async () => {
    await fillRequiredFields();

    await submit();

    expect(taskService.createTaskWithDetails).toHaveBeenCalledWith(
      expect.objectContaining({ task: expect.objectContaining({ status: 'todo' }) }),
    );
  });

  it('resets TaskForm and navigates to the board after successful page creation', async () => {
    const reset = vi.spyOn(childTaskForm(), 'reset');

    await component.onSubmitted(formValue());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(reset).toHaveBeenCalledOnce();
    expect(component.successToast()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-toast')).toBeTruthy();
    expect(router.navigate).toHaveBeenCalledWith(['/board']);
  });

  it('navigates on the page and reports upwards without navigating in the overlay', async () => {
    const saves: Task[] = [];
    component.saved.subscribe((task) => saves.push(task));
    await fillRequiredFields();

    await submit();

    expect(component.successToast()).toBe(true);
    expect(saves).toEqual([]);
    expect(router.navigate).toHaveBeenCalledOnce();

    router.navigate.mockClear();
    fixture.componentRef.setInput('inOverlay', true);
    await fillRequiredFields();
    await submit();

    expect(saves).toEqual([createTask()]);
    expect(component.successToast()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('reads Cancel instead of Clear inside the overlay', async () => {
    const label = () =>
      fixture.nativeElement.querySelector('.task-form__actions app-button').textContent.trim();

    expect(label()).toBe('Clear');

    fixture.componentRef.setInput('inOverlay', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(label()).toBe('Cancel');
  });

  it('empties the form and reports back when cancelled', async () => {
    let cancelled = 0;
    component.cancelled.subscribe(() => (cancelled += 1));
    fixture.componentRef.setInput('inOverlay', true);
    await fillRequiredFields();
    const taskForm = childTaskForm();

    taskForm.onSecondaryAction();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cancelled).toBe(1);
    expect(taskForm.formModel()).toEqual(createEmptyTaskFormValue());
    expect(taskService.createTaskWithDetails).not.toHaveBeenCalled();
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
    expect(router.navigate).not.toHaveBeenCalled();
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

  /**
   * Submits through the real TaskForm pipeline, so validation and the wiring
   * between the reusable form and the container are part of the test.
   */
  async function submit(): Promise<void> {
    await childTaskForm().onSubmit(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function fillRequiredFields(): Promise<void> {
    const taskForm = childTaskForm();
    taskForm.formModel.update((value) => ({
      ...value,
      title: 'Write the docs',
      dueDate: taskForm.today,
      category: 'user_story',
    }));
    fixture.detectChanges();
    await fixture.whenStable();
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
