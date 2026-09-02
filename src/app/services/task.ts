import { Service, inject, signal } from '@angular/core';

import {
  NewTask,
  NewTaskWithDetails,
  Subtask,
  Task,
  TaskChanges,
  TaskStatus,
  TaskWithDetails,
} from '../models/task';
import { SupabaseService } from './supabase';

@Service()
export class TaskService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly tasksState = signal<TaskWithDetails[]>([]);
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
      .select(
        `
          *,
          subtasks (*),
          assignees:task_assignees (
            task_id,
            contact_id,
            created_at,
            contact:contacts!task_assignees_contact_id_fkey (*)
          )
        `,
      )
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    this.loadingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return false;
    }

    this.tasksState.set(
      ((data ?? []) as TaskWithDetails[]).map((task) => this.normalizeTaskDetails(task)),
    );
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
    this.addTaskToState(this.withEmptyDetails(createdTask));

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

    this.addTaskToState(this.withEmptyDetails(createdTask));
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
        .map((task) =>
          task.id === id
            ? { ...updatedTask, subtasks: task.subtasks, assignees: task.assignees }
            : task,
        )
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

  async moveTask(id: string, status: TaskStatus, position: number): Promise<Task | null> {
    if (!Number.isInteger(position) || position < 0) {
      this.errorState.set('Task position must be a non-negative integer.');
      return null;
    }

    this.savingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase.rpc('move_task', {
      p_task_id: id,
      p_status: status,
      p_position: position,
    });

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return null;
    }

    const updatedTasks = (data ?? []) as Task[];
    const updatesById = new Map(updatedTasks.map((task) => [task.id, task]));

    this.tasksState.update((tasks) =>
      tasks
        .map((task) => {
          const updatedTask = updatesById.get(task.id);
          return updatedTask
            ? { ...updatedTask, subtasks: task.subtasks, assignees: task.assignees }
            : task;
        })
        .sort(
          (taskA, taskB) =>
            taskA.position - taskB.position || taskA.created_at.localeCompare(taskB.created_at),
        ),
    );

    return updatesById.get(id) ?? null;
  }

  /**
   * Replaces a subtask inside the loaded tasks so the board reflects the change at once.
   *
   * @param subtask - The updated subtask as returned by the subtask service.
   */
  applySubtaskChange(subtask: Subtask): void {
    this.tasksState.update((tasks) =>
      tasks.map((task) =>
        task.id === subtask.task_id
          ? {
              ...task,
              subtasks: task.subtasks.map((existing) =>
                existing.id === subtask.id ? subtask : existing,
              ),
            }
          : task,
      ),
    );
  }

  private addTaskToState(task: TaskWithDetails): void {
    this.tasksState.update((tasks) =>
      [...tasks, task].sort(
        (taskA, taskB) =>
          taskA.position - taskB.position || taskA.created_at.localeCompare(taskB.created_at),
      ),
    );
  }

  private withEmptyDetails(task: Task): TaskWithDetails {
    return { ...task, subtasks: [], assignees: [] };
  }

  private normalizeTaskDetails(task: TaskWithDetails): TaskWithDetails {
    return {
      ...task,
      subtasks: [...(task.subtasks ?? [])].sort(
        (subtaskA, subtaskB) =>
          subtaskA.position - subtaskB.position ||
          subtaskA.created_at.localeCompare(subtaskB.created_at),
      ),
      assignees: [...(task.assignees ?? [])].sort((assigneeA, assigneeB) =>
        assigneeA.created_at.localeCompare(assigneeB.created_at),
      ),
    };
  }

  private nextTaskPosition(status: TaskStatus): number {
    const positions = this.tasksState()
      .filter((task) => task.status === status)
      .map((task) => task.position);

    return positions.length === 0 ? 0 : Math.max(...positions) + 1;
  }
}
