import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import type { Contact } from '../../../models/contact';
import { AssignedContacts } from './assigned-contacts/assigned-contacts';
import { SubtaskInput } from './subtask-input/subtask-input';
import { TaskForm } from './task-form';
import {
  cloneTaskFormValue,
  createEmptyTaskFormValue,
  type TaskFormValue,
} from './task-form-value';

describe('TaskForm', () => {
  let component: TaskForm;
  let fixture: ComponentFixture<TaskForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskForm] }).compileComponents();
    fixture = TestBed.createComponent(TaskForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('starts with the create defaults', () => {
    expect(component.formModel()).toEqual(createEmptyTaskFormValue());
    expect(component.formModel().priority).toBe('medium');
    expect(textOf('.task-form__actions')).toContain('Clear');
    expect(textOf('.task-form__actions')).toContain('Create Task');
  });

  it('requires a non-whitespace title', async () => {
    component.formModel.update((value) => ({ ...value, title: '   ' }));
    component.taskForm.title().markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.taskForm.title().invalid()).toBe(true);
    expect(textOf(`#${component.titleErrorId}`)).toContain('Title is required.');
    expect(input(component.titleInputId).getAttribute('aria-invalid')).toBe('true');
    expect(input(component.titleInputId).getAttribute('aria-describedby')).toBe(
      component.titleErrorId,
    );
  });

  it('accepts 100 title characters and rejects 101', async () => {
    component.formModel.update((value) => ({ ...value, title: 'a'.repeat(100) }));
    await fixture.whenStable();
    expect(component.taskForm.title().valid()).toBe(true);

    component.formModel.update((value) => ({ ...value, title: 'a'.repeat(101) }));
    component.taskForm.title().markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.taskForm.title().invalid()).toBe(true);
    expect(textOf(`#${component.titleErrorId}`)).toContain(
      'Title must have 100 characters or fewer.',
    );
    expect(textOf('.task-form__counter')).toBe('101/100');
  });

  it('requires a due date and rejects a past date', async () => {
    component.taskForm.dueDate().markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(textOf(`#${component.dueDateErrorId}`)).toContain('Due date is required.');

    component.formModel.update((value) => ({ ...value, dueDate: '2000-01-01' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.taskForm.dueDate().invalid()).toBe(true);
    expect(textOf(`#${component.dueDateErrorId}`)).toContain('Due date cannot be in the past.');
  });

  it('requires a category', async () => {
    component.taskForm.category().markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.taskForm.category().invalid()).toBe(true);
    expect(textOf(`#${component.categoryErrorId}`)).toContain('Category is required.');
  });

  it('changes priority without affecting the remaining form value', () => {
    component.formModel.update((value) => ({ ...value, title: 'Keep me' }));
    component.selectPriority('urgent');

    expect(component.formModel().priority).toBe('urgent');
    expect(component.formModel().title).toBe('Keep me');
  });

  it('stores contact selection in the form value', async () => {
    fixture.componentRef.setInput('contacts', [createContact()]);
    fixture.detectChanges();
    await fixture.whenStable();

    const selector = fixture.debugElement.query(By.directive(AssignedContacts))
      .componentInstance as AssignedContacts;
    selector.toggleContact('contact-1');

    expect(component.formModel().contactIds).toEqual(['contact-1']);
  });

  it('stores new subtasks with stable client identity and completion state', async () => {
    const subtaskInput = fixture.debugElement.query(By.directive(SubtaskInput))
      .componentInstance as SubtaskInput;
    subtaskInput.draft.set('Write tests');
    subtaskInput.addSubtask();
    await fixture.whenStable();

    expect(component.formModel().subtasks).toHaveLength(1);
    expect(component.formModel().subtasks[0]).toMatchObject({
      kind: 'new',
      title: 'Write tests',
      isCompleted: false,
    });
    const createdSubtask = component.formModel().subtasks[0];
    expect(createdSubtask.kind).toBe('new');
    if (createdSubtask.kind === 'new') {
      expect(createdSubtask.clientId).toMatch(/^new-subtask-/);
    }
  });

  it('clear restores values, validation state, contacts, subtasks, and subtask draft', async () => {
    component.formModel.set(validValue());
    component.taskForm.title().markAsTouched();
    const subtaskInput = fixture.debugElement.query(By.directive(SubtaskInput))
      .componentInstance as SubtaskInput;
    subtaskInput.draft.set('Uncommitted draft');
    const cleared = vi.fn();
    component.cleared.subscribe(cleared);

    component.onSecondaryAction();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.formModel()).toEqual(createEmptyTaskFormValue());
    expect(component.taskForm.title().touched()).toBe(false);
    expect(subtaskInput.draft()).toBe('');
    expect(subtaskInput.draftError()).toBeNull();
    expect(cleared).toHaveBeenCalledOnce();
  });

  it('disables every interactive control and prevents submission while busy', async () => {
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.formModel.set(validValue());
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const controls = Array.from(
      fixture.nativeElement.querySelectorAll('input, textarea, select, button') as NodeListOf<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement
      >,
    );
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every((control) => control.matches(':disabled'))).toBe(true);

    await component.onSubmit(new Event('submit', { cancelable: true }));
    expect(submitted).not.toHaveBeenCalled();
  });

  it('emits a complete value for valid submission', async () => {
    const value = validValue();
    const expectedValue = cloneTaskFormValue(value);
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.formModel.set(value);

    await component.onSubmit(new Event('submit', { cancelable: true }));

    expect(submitted).toHaveBeenCalledWith(expectedValue);
    expect(submitted.mock.calls[0][0]).not.toBe(value);
    expect(Object.getOwnPropertySymbols(submitted.mock.calls[0][0].subtasks[0])).toEqual([]);

    const emittedValue = submitted.mock.calls[0][0] as TaskFormValue;
    emittedValue.contactIds.push('contact-2');
    emittedValue.subtasks[0].title = 'Changed outside';
    expect(component.formModel().contactIds).toEqual(['contact-1']);
    expect(component.formModel().subtasks[0].title).toBe('Write tests');
  });

  it('does not emit when submission is invalid', async () => {
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);

    await component.onSubmit(new Event('submit', { cancelable: true }));

    expect(submitted).not.toHaveBeenCalled();
    expect(component.taskForm.title().touched()).toBe(true);
    expect(component.taskForm.dueDate().touched()).toBe(true);
    expect(component.taskForm.category().touched()).toBe(true);
    expect(document.activeElement).toBe(input(component.titleInputId));
  });

  it('initializes a complete value with contacts and existing subtasks', async () => {
    const initialValue = completeInitialValue();
    fixture.componentRef.setInput('initialValue', initialValue);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.formModel()).toMatchObject(initialValue);
    expect(component.formModel().contactIds).toEqual(['contact-1']);
    expect(component.formModel().subtasks[0]).toMatchObject({
      kind: 'existing',
      id: 'subtask-1',
      title: 'Existing work',
      isCompleted: true,
    });
  });

  it('deeply isolates form mutations from the supplied initial value', async () => {
    const initialValue = completeInitialValue();
    fixture.componentRef.setInput('initialValue', initialValue);
    fixture.detectChanges();
    await fixture.whenStable();

    component.setContactIds(['contact-2']);
    component.setSubtasks([
      { kind: 'existing', id: 'subtask-1', title: 'Changed', isCompleted: false },
    ]);

    expect(initialValue.contactIds).toEqual(['contact-1']);
    expect(initialValue.subtasks[0]).toMatchObject({ title: 'Existing work', isCompleted: true });
  });

  it('does not overwrite a dirty draft when initialValue is replaced', async () => {
    fixture.componentRef.setInput('initialValue', completeInitialValue());
    fixture.detectChanges();
    await fixture.whenStable();
    setInputValue(input(component.titleInputId), 'Dirty draft');

    const replacement = { ...completeInitialValue(), title: 'Replacement task' };
    fixture.componentRef.setInput('initialValue', replacement);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.formModel().title).toBe('Dirty draft');
    component.reset();
    expect(component.formModel().title).toBe('Replacement task');
  });

  it('shows edit actions and cancels without submitting', async () => {
    const cancelled = vi.fn();
    const submitted = vi.fn();
    component.cancelled.subscribe(cancelled);
    component.submitted.subscribe(submitted);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(textOf('.task-form__actions')).toContain('Cancel');
    expect(textOf('.task-form__actions')).toContain('Save');
    component.onSecondaryAction();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(submitted).not.toHaveBeenCalled();
  });

  it('keeps the title counter outside the validation live region', () => {
    const counter = fixture.nativeElement.querySelector('.task-form__counter') as HTMLElement;
    const announcement = fixture.nativeElement.querySelector(`#${component.titleErrorId}`);

    expect(counter.closest('[aria-live]')).toBeNull();
    expect(announcement.getAttribute('aria-live')).toBe('polite');
    expect(input(component.titleInputId).getAttribute('aria-describedby')).toBe(
      component.titleErrorId,
    );
  });

  it('uses a narrow-screen-safe action group with full-width buttons', () => {
    const actions = fixture.nativeElement.querySelector('.task-form__actions');
    const buttons = fixture.debugElement
      .queryAll(By.css('.task-form__actions app-button'))
      .map((debugElement) => debugElement.componentInstance);

    expect(actions).toBeTruthy();
    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.fullWidth())).toBe(true);
  });

  function input(id: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
  }

  function textOf(selector: string): string {
    return (fixture.nativeElement.querySelector(selector)?.textContent ?? '').trim();
  }
});

function validValue(): TaskFormValue {
  return {
    title: 'Build TaskForm',
    description: 'Keep Add Task working',
    dueDate: '2099-12-31',
    priority: 'low',
    category: 'technical_task',
    contactIds: ['contact-1'],
    subtasks: [
      {
        kind: 'new',
        clientId: 'new-subtask-test',
        title: 'Write tests',
        isCompleted: false,
      },
    ],
  };
}

function completeInitialValue(): TaskFormValue {
  return {
    title: 'Existing task',
    description: 'Existing description',
    dueDate: '2099-12-31',
    priority: 'urgent',
    category: 'user_story',
    contactIds: ['contact-1'],
    subtasks: [
      {
        kind: 'existing',
        id: 'subtask-1',
        title: 'Existing work',
        isCompleted: true,
      },
    ],
  };
}

function setInputValue(element: HTMLInputElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
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
