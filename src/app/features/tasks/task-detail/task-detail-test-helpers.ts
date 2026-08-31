import type { Subtask, TaskWithDetails } from '../../../models/task';
import type { TaskAssigneeWithContact } from '../../../models/task-assignee';

export function createTask(overrides: Partial<TaskWithDetails> = {}): TaskWithDetails {
  return {
    id: 'task-1',
    owner_id: 'user-1',
    title: 'Test task',
    description: 'Test description',
    due_date: '2026-08-30',
    priority: 'medium',
    category: 'user_story',
    status: 'todo',
    position: 0,
    created_at: '2026-08-25T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z',
    subtasks: [],
    assignees: [],
    ...overrides,
  };
}

export function createSubtask(title: string, isCompleted: boolean): Subtask {
  return {
    id: `subtask-${title}`,
    task_id: 'task-1',
    title,
    is_completed: isCompleted,
    position: 0,
    created_at: '2026-08-25T00:00:00.000Z',
  };
}

export function createAssignee(
  contactId: string,
  firstName: string,
  lastName: string,
  color: string,
): TaskAssigneeWithContact {
  return {
    task_id: 'task-1',
    contact_id: contactId,
    created_at: '2026-08-25T00:00:00.000Z',
    contact: {
      id: contactId,
      created_at: '2026-08-25T00:00:00.000Z',
      first_name: firstName,
      last_name: lastName,
      email: 'contact@example.com',
      phone: '+49123456789',
      color,
      updated_at: '2026-08-25T00:00:00.000Z',
    },
  };
}
