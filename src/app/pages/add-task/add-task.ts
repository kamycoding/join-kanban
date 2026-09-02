import { Component, OnInit, inject, signal, viewChild } from '@angular/core';

import { TaskForm } from '../../features/tasks/task-form/task-form';
import {
  createEmptyTaskFormValue,
  type TaskFormValue,
} from '../../features/tasks/task-form/task-form-value';
import { toNewTaskWithDetails } from '../../features/tasks/task-form/task-form-create-mapper';
import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';
import { Toast } from '../../shared/components/toast/toast';

@Component({
  selector: 'app-add-task',
  imports: [TaskForm, Toast],
  templateUrl: './add-task.html',
  styleUrl: './add-task.scss',
})
export class AddTask implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly taskService = inject(TaskService);

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

  async onSubmitted(value: TaskFormValue): Promise<void> {
    if (this.saving()) return;

    const createdTask = await this.taskService.createTaskWithDetails(toNewTaskWithDetails(value));
    if (createdTask) {
      this.taskForm().reset();
      this.successToast.set(true);
      this.persistenceError.set(null);
    } else {
      this.persistenceError.set(this.taskService.error());
    }
  }
}
