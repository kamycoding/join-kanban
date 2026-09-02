import {
  Component,
  ElementRef,
  WritableSignal,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import type { TaskFormSubtaskValue } from '../task-form-value';

const MAX_SUBTASK_TITLE_LENGTH = 100;
let newSubtaskCounter = 0;
let subtaskInputInstanceCounter = 0;

@Component({
  selector: 'app-subtask-input',
  imports: [],
  templateUrl: './subtask-input.html',
  styleUrl: './subtask-input.scss',
})
export class SubtaskInput {
  readonly subtasks = input.required<readonly TaskFormSubtaskValue[]>();
  readonly disabled = input(false);
  readonly labelledBy = input<string | null>(null);
  readonly subtasksChange = output<TaskFormSubtaskValue[]>();
  readonly draft = signal('');
  readonly draftError = signal<string | null>(null);
  readonly editingKey = signal<string | null>(null);
  readonly editDraft = signal('');
  readonly editError = signal<string | null>(null);

  private readonly instanceId = ++subtaskInputInstanceCounter;
  readonly draftErrorId = `subtask-draft-error-${this.instanceId}`;
  readonly editErrorId = `subtask-edit-error-${this.instanceId}`;
  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  constructor() {
    effect(() => this.editInput()?.nativeElement.focus());
  }

  /** Adds the trimmed draft while retaining a stable client identity. */
  addSubtask(): void {
    if (this.disabled()) return;
    const title = this.validatedTitle(this.draft(), this.draftError);
    if (!title) return;
    this.subtasksChange.emit([...this.subtasks(), createNewSubtask(title)]);
    this.clearDraft();
  }

  clearDraft(): void {
    this.draft.set('');
    this.draftError.set(null);
  }

  reset(): void {
    this.clearDraft();
    this.cancelEditing();
  }

  onDraftInput(event: Event): void {
    if (this.disabled()) return;
    this.draft.set(inputValue(event));
    this.draftError.set(null);
  }

  onDraftKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.addSubtask();
  }

  /** Opens inline editing without changing the subtask identity. */
  startEditing(subtask: TaskFormSubtaskValue): void {
    if (this.disabled()) return;
    this.editingKey.set(this.subtaskKey(subtask));
    this.editDraft.set(subtask.title);
    this.editError.set(null);
  }

  /** Applies a valid title to the existing subtask value. */
  confirmEditing(): void {
    if (this.disabled() || !this.editingKey()) return;
    const title = this.validatedTitle(this.editDraft(), this.editError);
    if (!title) return;
    this.emitRenamedSubtasks(this.editingKey()!, title);
    this.cancelEditing();
  }

  cancelEditing(): void {
    this.editingKey.set(null);
    this.editDraft.set('');
    this.editError.set(null);
  }

  onEditInput(event: Event): void {
    if (this.disabled()) return;
    this.editDraft.set(inputValue(event));
    this.editError.set(null);
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    if (event.key === 'Enter') this.confirmEditing();
    else this.cancelEditing();
  }

  removeSubtask(subtask: TaskFormSubtaskValue): void {
    if (this.disabled()) return;
    const keyToRemove = this.subtaskKey(subtask);
    this.subtasksChange.emit(
      this.subtasks().filter((item) => this.subtaskKey(item) !== keyToRemove),
    );
    if (this.editingKey() === keyToRemove) this.cancelEditing();
  }

  subtaskKey(subtask: TaskFormSubtaskValue): string {
    return subtask.kind === 'existing' ? `existing-${subtask.id}` : subtask.clientId;
  }

  private emitRenamedSubtasks(key: string, title: string): void {
    this.subtasksChange.emit(
      this.subtasks().map((subtask) =>
        this.subtaskKey(subtask) === key ? renameSubtask(subtask, title) : subtask,
      ),
    );
  }

  private validatedTitle(value: string, error: WritableSignal<string | null>): string {
    const title = value.trim();
    const message = validateSubtaskTitle(title);
    error.set(message);
    return message ? '' : title;
  }
}

function createNewSubtask(title: string): TaskFormSubtaskValue {
  return {
    kind: 'new',
    clientId: `new-subtask-${++newSubtaskCounter}`,
    title,
    isCompleted: false,
  };
}

function renameSubtask(subtask: TaskFormSubtaskValue, title: string): TaskFormSubtaskValue {
  return subtask.kind === 'existing'
    ? { kind: 'existing', id: subtask.id, title, isCompleted: subtask.isCompleted }
    : { kind: 'new', clientId: subtask.clientId, title, isCompleted: false };
}

function validateSubtaskTitle(title: string): string | null {
  if (!title) return 'Subtask title is required.';
  return title.length > MAX_SUBTASK_TITLE_LENGTH
    ? 'Subtask must have 100 characters or fewer.'
    : null;
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
