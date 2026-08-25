import { Service, inject, signal } from '@angular/core';

import { NewTask, NewTaskWithDetails, Task, TaskChanges, TaskStatus } from '../models/task';
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
    this.addTaskToState(createdTask);

    return createdTask;
  }

  async createTaskWithDetails(details: NewTaskWithDetails): Promise<Task | null> {
    this.savingState.set(true);
    this.errorState.set(null);

    const status = details.task.status ?? 'todo';
    const position = details.task.position ?? this.nextTaskPosition(status);
    const subtasks = (details.subtasks ?? []).map((subtask, index) => ({
      ...subtask,
      position: subtask.position ?? index,
    }));

    const { data, error } = await this.supabase.rpc('create_task_with_details', {
      p_title: details.task.title,
      p_description: details.task.description,
      p_due_date: details.task.due_date,
      p_priority: details.task.priority,
      p_category: details.task.category,
      p_status: status,
      p_position: position,
      p_subtasks: subtasks,
      p_contact_ids: [...new Set(details.contactIds ?? [])],
    });

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return null;
    }

    const createdTask = (Array.isArray(data) ? data[0] : data) as Task | undefined;

    if (!createdTask) {
      this.errorState.set('Task could not be created.');
      return null;
    }

    this.addTaskToState(createdTask);
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

  async deleteTask(id: string): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    const { error } = await this.supabase.from('tasks').delete().eq('id', id).select('id').single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return false;
    }

    this.tasksState.update((tasks) => tasks.filter((task) => task.id !== id));
    return true;
  }

  moveTask(id: string, status: TaskStatus, position: number): Promise<Task | null> {
    if (!Number.isInteger(position) || position < 0) {
      this.errorState.set('Task position must be a non-negative integer.');
      return Promise.resolve(null);
    }

    return this.updateTask(id, { status, position });
  }

  private addTaskToState(task: Task): void {
    this.tasksState.update((tasks) =>
      [...tasks, task].sort(
        (taskA, taskB) =>
          taskA.position - taskB.position || taskA.created_at.localeCompare(taskB.created_at),
      ),
    );
  }

  private nextTaskPosition(status: TaskStatus): number {
    const positions = this.tasksState()
      .filter((task) => task.status === status)
      .map((task) => task.position);

    return positions.length === 0 ? 0 : Math.max(...positions) + 1;
  }
}
