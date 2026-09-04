import { Component, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { TaskForm } from '../../features/tasks/task-form/task-form';
import {
  createEmptyTaskFormValue,
  type TaskFormValue,
} from '../../features/tasks/task-form/task-form-value';
import { toNewTaskWithDetails } from '../../features/tasks/task-form/task-form-create-mapper';
import type { Task, TaskStatus } from '../../models/task';
import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';
import { Toast } from '../../shared/components/toast/toast';

@Component({
  selector: 'app-add-task',
  imports: [TaskForm, Toast],
  templateUrl: './add-task.html',
  styleUrl: './add-task.scss',
  host: {
    '[class.add-task--in-overlay]': 'inOverlay()',
  },
})
export class AddTask implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly taskService = inject(TaskService);
  private readonly router = inject(Router);

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
  readonly persistenceError = signal<string | null>(null);
  readonly successToast = signal(false);
  readonly initialFormValue = createEmptyTaskFormValue();

  private readonly taskForm = viewChild.required(TaskForm);

  async ngOnInit(): Promise<void> {
    await this.contactService.getContacts();
  }

  onCleared(): void {
    this.successToast.set(false);
    this.persistenceError.set(null);
  }

  /**
   * Leaves the form without saving. Only reachable inside the overlay, where
   * the secondary button reads "Cancel" instead of "Clear".
   */
  onCancelled(): void {
    this.taskForm().reset();
    this.cancelled.emit();
  }

  async onSubmitted(value: TaskFormValue): Promise<void> {
    if (this.saving()) return;

    const createdTask = await this.taskService.createTaskWithDetails(
      toNewTaskWithDetails(value, this.status()),
    );
    if (createdTask) {
      this.taskForm().reset();
      this.persistenceError.set(null);

      if (this.inOverlay()) {
        this.successToast.set(false);
        this.saved.emit(createdTask);
        return;
      }

      this.successToast.set(true);
      await this.router.navigate(['/board']);
    } else {
      this.persistenceError.set(this.taskService.error());
    }
  }
}
