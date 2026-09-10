import { Service, inject, signal } from '@angular/core';

import { NewSubtask, Subtask, SubtaskChanges } from '../models/task';
import { SupabaseService } from './supabase';

@Service()
export class SubtaskService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly subtasksState = signal<Subtask[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly subtasks = this.subtasksState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /**
   * Retrieves subtasks.
   *
   * @param taskId - The identifier of the affected task.
   * @returns A promise that resolves to whether the operation succeeded.
   */
  async getSubtasks(taskId: string): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    this.loadingState.set(false);

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

  /**
   * Creates subtask.
   *
   * @param newSubtask - The new subtask value to use.
   * @returns A promise that resolves to the resulting value, or `null` when unavailable.
   */
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

  /**
   * Updates subtask.
   *
   * @param id - The identifier of the affected record.
   * @param changes - The changes to apply.
   * @returns A promise that resolves to the resulting value, or `null` when unavailable.
   */
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

  /**
   * Sets subtask completed.
   *
   * @param id - The identifier of the affected record.
   * @param isCompleted - The is completed value to use.
   * @returns A promise that resolves to the resulting value, or `null` when unavailable.
   */
  setSubtaskCompleted(id: string, isCompleted: boolean): Promise<Subtask | null> {
    return this.updateSubtask(id, { is_completed: isCompleted });
  }

  /**
   * Removes subtask.
   *
   * @param id - The identifier of the affected record.
   * @returns A promise that resolves to whether the operation succeeded.
   */
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

  /**
   * Performs the next subtask position operation.
   *
   * @param taskId - The identifier of the affected task.
   * @returns The resulting number.
   */
  private nextSubtaskPosition(taskId: string): number {
    const positions = this.subtasksState()
      .filter((subtask) => subtask.task_id === taskId)
      .map((subtask) => subtask.position);

    return positions.length === 0 ? 0 : Math.max(...positions) + 1;
  }

  /**
   * Performs the sort subtasks operation.
   *
   * @param subtasks - The subtasks to process.
   * @returns The resulting collection.
   */
  private sortSubtasks(subtasks: Subtask[]): Subtask[] {
    return subtasks.sort(
      (subtaskA, subtaskB) =>
        subtaskA.task_id.localeCompare(subtaskB.task_id) ||
        subtaskA.position - subtaskB.position ||
        subtaskA.created_at.localeCompare(subtaskB.created_at),
    );
  }
}
