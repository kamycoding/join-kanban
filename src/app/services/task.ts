import { Service, inject, signal } from '@angular/core';

import { NewTask, Task, TaskChanges } from '../models/task';
import { SupabaseService } from './supabase';

@Service()
export class TaskService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly tasksState = signal<Task[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly tasks = this.tasksState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async getTasks(): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    this.loadingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return false;
    }

    this.tasksState.set(data as Task[]);
    return true;
  }

  async createTask(newTask: NewTask): Promise<Task | null> {
    this.savingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase.from('tasks').insert(newTask).select('*').single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return null;
    }

    const createdTask = data as Task;
    this.tasksState.update((tasks) =>
      [...tasks, createdTask].sort(
        (taskA, taskB) =>
          taskA.position - taskB.position || taskA.created_at.localeCompare(taskB.created_at),
      ),
    );

    return createdTask;
  }

  async updateTask(id: string, changes: TaskChanges): Promise<Task | null> {
    this.savingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase
      .from('tasks')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return null;
    }

    const updatedTask = data as Task;
    this.tasksState.update((tasks) =>
      tasks
        .map((task) => (task.id === id ? updatedTask : task))
        .sort(
          (taskA, taskB) =>
            taskA.position - taskB.position || taskA.created_at.localeCompare(taskB.created_at),
        ),
    );

    return updatedTask;
  }
}
