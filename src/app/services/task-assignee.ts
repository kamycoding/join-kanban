import { Service, inject, signal } from '@angular/core';

import { NewTaskAssignee, TaskAssigneeWithContact } from '../models/task-assignee';
import { SupabaseService } from './supabase';

const TASK_ASSIGNEE_SELECT = `
  task_id,
  contact_id,
  created_at,
  contact:contacts!task_assignees_contact_id_fkey(*)
`;

@Service()
export class TaskAssigneeService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly assigneesState = signal<TaskAssigneeWithContact[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly assignees = this.assigneesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async getAssignees(taskId: string): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const { data, error } = await this.supabase
      .from('task_assignees')
      .select(TASK_ASSIGNEE_SELECT)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    this.loadingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return false;
    }

    this.assigneesState.update((assignees) => [
      ...assignees.filter((assignee) => assignee.task_id !== taskId),
      ...(data as unknown as TaskAssigneeWithContact[]),
    ]);
    return true;
  }

  async assignContact(taskId: string, contactId: string): Promise<TaskAssigneeWithContact | null> {
    this.savingState.set(true);
    this.errorState.set(null);

    const assignment: NewTaskAssignee = {
      task_id: taskId,
      contact_id: contactId,
    };

    const { data, error } = await this.supabase
      .from('task_assignees')
      .insert(assignment)
      .select(TASK_ASSIGNEE_SELECT)
      .single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return null;
    }

    const createdAssignment = data as unknown as TaskAssigneeWithContact;
    this.assigneesState.update((assignees) => [...assignees, createdAssignment]);
    return createdAssignment;
  }

  async removeContact(taskId: string, contactId: string): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);

    const { error } = await this.supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .eq('contact_id', contactId)
      .select('task_id, contact_id')
      .single();

    this.savingState.set(false);

    if (error) {
      this.errorState.set(error.message);
      return false;
    }

    this.assigneesState.update((assignees) =>
      assignees.filter(
        (assignee) => assignee.task_id !== taskId || assignee.contact_id !== contactId,
      ),
    );
    return true;
  }
}
