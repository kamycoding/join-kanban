import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, disabled, form, submit, validate } from '@angular/forms/signals';

import type { Contact } from '../../../models/contact';
import type { TaskPriority } from '../../../models/task';
import { Button } from '../../../shared/components/button/button';
import { AssignedContacts } from './assigned-contacts/assigned-contacts';
import { SubtaskInput } from './subtask-input/subtask-input';
import {
  cloneTaskFormValue,
  createEmptyTaskFormValue,
  type TaskFormMode,
  type TaskFormSubtaskValue,
  type TaskFormValue,
} from './task-form-value';

let taskFormInstanceCounter = 0;

@Component({
  selector: 'app-task-form',
  imports: [AssignedContacts, Button, FormField, SubtaskInput],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm {
  readonly initialValue = input<TaskFormValue>(createEmptyTaskFormValue());
  readonly contacts = input<readonly Contact[]>([]);
  readonly mode = input<TaskFormMode>('create');
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<TaskFormValue>();
  readonly cancelled = output<void>();
  readonly cleared = output<void>();

  readonly priorities: readonly TaskPriority[] = ['urgent', 'medium', 'low'];
  readonly today = toLocalDateInputValue(new Date());
  readonly formModel = signal<TaskFormValue>(createEmptyTaskFormValue());
  readonly taskForm = form(this.formModel, (path) => {
    disabled(path, { when: () => this.busy() });
    validate(path.title, ({ value }) => validateTitle(value()));
    validate(path.dueDate, ({ value }) => validateDueDate(value(), this.today));
    validate(path.category, ({ value }) =>
      value() ? null : { kind: 'required', message: 'Category is required.' },
    );
  });

  readonly submitLabel = computed(() => {
    if (this.busy()) {
      return this.mode() === 'create' ? 'Creating…' : 'Updating…';
    }

    return this.mode() === 'create' ? 'Create Task' : 'Save';
  });
  readonly secondaryLabel = computed(() => (this.mode() === 'create' ? 'Clear' : 'Cancel'));

  private readonly instanceId = ++taskFormInstanceCounter;
  readonly titleErrorId = `task-title-error-${this.instanceId}`;
  readonly dueDateErrorId = `task-due-date-error-${this.instanceId}`;
  readonly categoryErrorId = `task-category-error-${this.instanceId}`;
  readonly assignedContactsLabelId = `task-assigned-contacts-label-${this.instanceId}`;
  readonly subtasksLabelId = `task-subtasks-label-${this.instanceId}`;
  readonly titleInputId = `task-title-${this.instanceId}`;
  readonly descriptionInputId = `task-description-${this.instanceId}`;
  readonly dueDateInputId = `task-due-date-${this.instanceId}`;
  readonly categoryInputId = `task-category-${this.instanceId}`;

  private readonly subtaskInput = viewChild(SubtaskInput);
  private readonly titleInput = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');
  private readonly dueDateInput = viewChild.required<ElementRef<HTMLInputElement>>('dueDateInput');
  private readonly categoryInput =
    viewChild.required<ElementRef<HTMLSelectElement>>('categoryInput');
  private acceptedInitialValue = createEmptyTaskFormValue();
  private hasAcceptedInitialValue = false;

  constructor() {
    effect(() => this.acceptInitialValue(this.initialValue()));
  }

  selectPriority(priority: TaskPriority): void {
    if (!this.busy()) {
      this.formModel.update((value) => ({ ...value, priority }));
      this.taskForm().markAsDirty();
    }
  }

  setContactIds(contactIds: string[]): void {
    if (!this.busy()) {
      this.formModel.update((value) => ({ ...value, contactIds }));
      this.taskForm().markAsDirty();
    }
  }

  setSubtasks(subtasks: TaskFormSubtaskValue[]): void {
    if (!this.busy()) {
      this.formModel.update((value) => ({ ...value, subtasks }));
      this.taskForm().markAsDirty();
    }
  }

  reset(): void {
    if (!this.busy()) {
      this.resetTo(this.acceptedInitialValue);
    }
  }

  onSecondaryAction(): void {
    if (this.busy()) return;

    if (this.mode() === 'create') {
      this.reset();
      this.cleared.emit();
    } else {
      this.cancelled.emit();
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    const wasSubmitted = await submit(this.taskForm, async (field) => {
      this.submitted.emit(cloneTaskFormValue(field().value()));
    });

    if (!wasSubmitted) this.focusFirstInvalidControl();
  }

  private acceptInitialValue(value: TaskFormValue): void {
    untracked(() => {
      const shouldInitialize = !this.hasAcceptedInitialValue || !this.taskForm().dirty();
      this.acceptedInitialValue = cloneTaskFormValue(value);
      this.hasAcceptedInitialValue = true;
      if (shouldInitialize) this.resetTo(this.acceptedInitialValue);
    });
  }

  private resetTo(value: TaskFormValue): void {
    this.taskForm().reset(cloneTaskFormValue(value));
    this.subtaskInput()?.reset();
  }

  private focusFirstInvalidControl(): void {
    if (this.taskForm.title().invalid()) this.titleInput().nativeElement.focus();
    else if (this.taskForm.dueDate().invalid()) this.dueDateInput().nativeElement.focus();
    else if (this.taskForm.category().invalid()) this.categoryInput().nativeElement.focus();
  }
}

function validateTitle(value: string): { kind: string; message: string } | null {
  const title = value.trim();
  if (!title) return { kind: 'required', message: 'Title is required.' };
  return title.length > 100
    ? { kind: 'maxLength', message: 'Title must have 100 characters or fewer.' }
    : null;
}

function validateDueDate(
  value: string,
  minimumDate: string,
): { kind: string; message: string } | null {
  if (!value) return { kind: 'required', message: 'Due date is required.' };
  return value < minimumDate
    ? { kind: 'minimum', message: 'Due date cannot be in the past.' }
    : null;
}

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
