import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-subtask-input',
  imports: [],
  templateUrl: './subtask-input.html',
  styleUrl: './subtask-input.scss',
})
export class SubtaskInput {
  readonly subtasks = input.required<string[]>();
  readonly disabled = input(false);
  readonly subtasksChange = output<string[]>();
  readonly draft = signal('');
  readonly error = signal<string | null>(null);

  addSubtask(): void {
    const title = this.draft().trim();
    if (!title) return;
    if (title.length > 100) {
      this.error.set('Subtask must have 100 characters or fewer.');
      return;
    }
    this.subtasksChange.emit([...this.subtasks(), title]);
    this.draft.set('');
    this.error.set(null);
  }

  clearDraft(): void {
    this.draft.set('');
    this.error.set(null);
  }

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSubtask();
    }
  }

  removeSubtask(index: number): void {
    this.subtasksChange.emit(this.subtasks().filter((_, currentIndex) => currentIndex !== index));
  }
}
