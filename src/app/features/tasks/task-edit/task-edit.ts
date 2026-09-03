import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import type { TaskWithDetails } from '../../../models/task';
import { ContactService } from '../../../services/contact';
import { SubtaskService } from '../../../services/subtask';
import { TaskAssigneeService } from '../../../services/task-assignee';
import { TaskService } from '../../../services/task';
import { TaskForm } from '../task-form/task-form';
import {
  toTaskEditPlan,
  toTaskFormValue,
  type TaskEditPlan,
} from '../task-form/task-form-edit-mapper';
import type { TaskFormValue } from '../task-form/task-form-value';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Component({
  selector: 'app-task-edit',
  imports: [TaskForm],
  templateUrl: './task-edit.html',
  styleUrl: './task-edit.scss',
})
export class TaskEdit implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly taskService = inject(TaskService);
  private readonly taskAssigneeService = inject(TaskAssigneeService);
  private readonly subtaskService = inject(SubtaskService);

  readonly task = input.required<TaskWithDetails>();

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly contacts = this.contactService.contacts;
  readonly saving = signal(false);
  readonly persistenceError = signal<string | null>(null);
  readonly initialValue = computed(() => toTaskFormValue(this.task()));

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    afterNextRender(() => this.focusFirstField());
  }

  async ngOnInit(): Promise<void> {
    await this.contactService.getContacts();
  }

  cancel(): void {
    if (this.saving()) return;

    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel();
    }
  }

  async onSave(value: TaskFormValue): Promise<void> {
    if (this.saving()) return;

    this.saving.set(true);
    this.persistenceError.set(null);

    try {
      await this.persistPlan(toTaskEditPlan(value, this.task()));
    } finally {
      this.saving.set(false);
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.cancel();
  }

  @HostListener('document:keydown', ['$event'])
  containTabFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      this.panel().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      event.preventDefault();
      return;
    }

    const focusIsInside = this.panel().nativeElement.contains(document.activeElement);

    if (event.shiftKey && (document.activeElement === first || !focusIsInside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !focusIsInside)) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('document:focusin', ['$event'])
  redirectFocus(event: FocusEvent): void {
    const panel = this.panel().nativeElement;

    if (event.target instanceof Node && !panel.contains(event.target)) {
      panel.querySelector<HTMLElement>('input, button')?.focus();
    }
  }

  private async persistPlan(plan: TaskEditPlan): Promise<void> {
    const taskId = this.task().id;

    if (Object.keys(plan.taskChanges).length > 0) {
      const updated = await this.taskService.updateTask(taskId, plan.taskChanges);

      if (!updated) {
        await this.saveFailed(this.taskService.error());
        return;
      }
    }

    if (!(await this.syncAssignees(plan, taskId))) return;
    if (!(await this.syncSubtasks(plan, taskId))) return;
    await this.finishSave();
  }

  private async syncAssignees(plan: TaskEditPlan, taskId: string): Promise<boolean> {
    for (const contactId of plan.assigneesToRemove) {
      const removed = await this.taskAssigneeService.removeContact(taskId, contactId);

      if (!removed) {
        await this.saveFailed(this.taskAssigneeService.error());
        return false;
      }
    }

    for (const contactId of plan.assigneesToAdd) {
      const assigned = await this.taskAssigneeService.assignContact(taskId, contactId);

      if (!assigned) {
        await this.saveFailed(this.taskAssigneeService.error());
        return false;
      }
    }

    return true;
  }

  private async syncSubtasks(plan: TaskEditPlan, taskId: string): Promise<boolean> {
    for (const subtaskId of plan.subtasksToDelete) {
      const deleted = await this.subtaskService.deleteSubtask(subtaskId);

      if (!deleted) {
        await this.saveFailed(this.subtaskService.error());
        return false;
      }
    }

    for (const change of plan.subtasksToUpdate) {
      const updated = await this.subtaskService.updateSubtask(change.id, { title: change.title });

      if (!updated) {
        await this.saveFailed(this.subtaskService.error());
        return false;
      }
    }

    for (const creation of plan.subtasksToCreate) {
      const created = await this.subtaskService.createSubtask({
        task_id: taskId,
        title: creation.title,
        position: creation.position,
      });

      if (!created) {
        await this.saveFailed(this.subtaskService.error());
        return false;
      }
    }

    return true;
  }

  private async finishSave(): Promise<void> {
    const refreshed = await this.taskService.getTasks();

    if (refreshed) {
      this.saved.emit();
    } else {
      this.persistenceError.set(this.taskService.error() ?? 'Task could not be saved.');
    }
  }

  private async saveFailed(message: string | null): Promise<void> {
    this.persistenceError.set(message ?? 'Task could not be saved.');
    await this.taskService.getTasks();
  }

  private focusFirstField(): void {
    this.panel().nativeElement.querySelector<HTMLElement>('input')?.focus();
  }
}
