import { Service, inject, signal } from '@angular/core';

import {
  NewSubtask,
  NewTask,
  Subtask,
  SubtaskChanges,
  Task,
  TaskChanges,
  TaskStatus,
} from '../models/task';
import { SupabaseService } from './supabase';

@Service()
export class TaskService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly tasksState = signal<Task[]>([]);
  private readonly subtasksState = signal<Subtask[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadingSubtasksState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly tasks = this.tasksState.asReadonly();
  readonly subtasks = this.subtasksState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingSubtasks = this.loadingSubtasksState.asReadonly();
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
    this.subtasksState.update((subtasks) => subtasks.filter((subtask) => subtask.task_id !== id));
    return true;
  }

  moveTask(id: string, status: TaskStatus, position: number): Promise<Task | null> {
    if (!Number.isInteger(position) || position < 0) {
      this.errorState.set('Task position must be a non-negative integer.');
      return Promise.resolve(null);
    }

    return this.updateTask(id, { status, position });
  }

  async getSubtasks(taskId: string): Promise<boolean> {
    this.loadingSubtasksState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    this.loadingSubtasksState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return false;
    }

    this.subtasksState.update((subtasks) =>
      this.sortSubtasks([
        ...subtasks.filter((subtask) => subtask.task_id !== taskId),
        ...(data as Subtask[]),
      ]),
    );
    return true;
  }

  async createSubtask(newSubtask: NewSubtask): Promise<Subtask | null> {
    this.savingState.set(true);
    this.errorState.set(null);

    const subtaskToCreate: NewSubtask = {
      ...newSubtask,
      position: newSubtask.position ?? this.nextSubtaskPosition(newSubtask.task_id),
    };

    const { data, error } = await this.supabase
      .from('subtasks')
      .insert(subtaskToCreate)
      .select('*')
      .single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return null;
    }

    const createdSubtask = data as Subtask;
    this.subtasksState.update((subtasks) => this.sortSubtasks([...subtasks, createdSubtask]));
    return createdSubtask;
  }

  async updateSubtask(id: string, changes: SubtaskChanges): Promise<Subtask | null> {
    if (
      changes.position !== undefined &&
      (!Number.isInteger(changes.position) || changes.position < 0)
    ) {
      this.errorState.set('Subtask position must be a non-negative integer.');
      return null;
    }

    this.savingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase
      .from('subtasks')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return null;
    }

    const updatedSubtask = data as Subtask;
    this.subtasksState.update((subtasks) =>
      this.sortSubtasks(subtasks.map((subtask) => (subtask.id === id ? updatedSubtask : subtask))),
    );
    return updatedSubtask;
  }

  setSubtaskCompleted(id: string, isCompleted: boolean): Promise<Subtask | null> {
    return this.updateSubtask(id, { is_completed: isCompleted });
  }

  async deleteSubtask(id: string): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    const { error } = await this.supabase
      .from('subtasks')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return false;
    }

    this.subtasksState.update((subtasks) => subtasks.filter((subtask) => subtask.id !== id));
    return true;
  }

  private nextSubtaskPosition(taskId: string): number {
    const positions = this.subtasksState()
      .filter((subtask) => subtask.task_id === taskId)
      .map((subtask) => subtask.position);

    return positions.length === 0 ? 0 : Math.max(...positions) + 1;
  }

  private sortSubtasks(subtasks: Subtask[]): Subtask[] {
    return subtasks.sort(
      (subtaskA, subtaskB) =>
        subtaskA.task_id.localeCompare(subtaskB.task_id) ||
        subtaskA.position - subtaskB.position ||
        subtaskA.created_at.localeCompare(subtaskB.created_at),
    );
  }
}
