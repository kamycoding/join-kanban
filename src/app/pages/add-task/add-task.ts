import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormField, form, submit, validate } from '@angular/forms/signals';

import {
  NewTaskWithDetails,
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '../../models/task';
import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';
import { Button } from '../../shared/components/button/button';
import { Toast } from '../../shared/components/toast/toast';
import { AssignedContacts } from './assigned-contacts/assigned-contacts';
import { SubtaskInput } from './subtask-input/subtask-input';

interface AddTaskFormValue {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  category: TaskCategory | '';
}

const INITIAL_FORM_VALUE: AddTaskFormValue = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  category: '',
};

@Component({
  selector: 'app-add-task',
  imports: [AssignedContacts, Button, FormField, SubtaskInput, Toast],
  templateUrl: './add-task.html',
  styleUrl: './add-task.scss',
  host: {
    '[class.add-task--in-overlay]': 'inOverlay()',
  },
})
export class AddTask implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly taskService = inject(TaskService);

  /**
   * The column a new task lands in. The board hands it the column the user
   * clicked; as a routed page it arrives from the `status` query parameter.
   */
  readonly status = input<TaskStatus>('todo');

  /**
   * Set by the board when the form runs inside its overlay. The overlay
   * carries the heading, and the left button cancels instead of clearing.
   */
  readonly inOverlay = input(false);

  readonly saved = output<Task>();
  readonly cancelled = output<void>();

  readonly contacts = this.contactService.contacts;
  readonly saving = this.taskService.saving;
  readonly serviceError = this.taskService.error;
  readonly selectedContactIds = signal<string[]>([]);
  readonly subtasks = signal<string[]>([]);
  readonly successToast = signal(false);
  readonly today = toLocalDateInputValue(new Date());
  readonly priorities: readonly TaskPriority[] = ['urgent', 'medium', 'low'];
  readonly formModel = signal<AddTaskFormValue>({ ...INITIAL_FORM_VALUE });
  readonly taskForm = form(this.formModel, (path) => {
    validate(path.title, ({ value }) => validateTitle(value()));
    validate(path.dueDate, ({ value }) => validateDueDate(value(), this.today));
    validate(path.category, ({ value }) =>
      value() ? null : { kind: 'required', message: 'Category is required.' },
    );
  });

  async ngOnInit(): Promise<void> {
    await this.contactService.getContacts();
  }

  selectPriority(priority: TaskPriority): void {
    if (!this.saving()) {
      this.formModel.update((value) => ({ ...value, priority }));
    }
  }

  clearForm(): void {
    if (this.saving()) return;
    this.taskForm().reset({ ...INITIAL_FORM_VALUE });
    this.selectedContactIds.set([]);
    this.subtasks.set([]);
    this.successToast.set(false);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;

    await submit(this.taskForm, async (field) => {
      const createdTask = await this.taskService.createTaskWithDetails(
        this.toPayload(field().value()),
      );
      if (!createdTask) {
        return;
      }

      this.clearForm();

      if (this.inOverlay()) {
        this.saved.emit(createdTask);
        return;
      }

      this.successToast.set(true);
    });
  }

  /**
   * Leaves the form without saving. Only reachable from the overlay, where
   * the left button reads "Cancel" instead of "Clear".
   */
  cancelForm(): void {
    if (this.saving()) {
      return;
    }

    this.clearForm();
    this.cancelled.emit();
  }

  private toPayload(value: AddTaskFormValue): NewTaskWithDetails {
    return {
      task: {
        title: value.title.trim(),
        description: value.description.trim(),
        due_date: value.dueDate,
        priority: value.priority,
        category: value.category as TaskCategory,
        status: this.status(),
      },
      contactIds: this.selectedContactIds(),
      subtasks: this.subtasks().map((title) => ({ title: title.trim() })),
    };
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
