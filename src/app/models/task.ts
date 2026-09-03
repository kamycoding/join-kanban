import { TaskAssigneeWithContact } from './task-assignee';

export const TASK_PRIORITIES = ['low', 'medium', 'urgent'] as const;
export const TASK_CATEGORIES = ['user_story', 'technical_task'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'await_feedback', 'done'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export type NewTask = Pick<Task, 'title' | 'description' | 'due_date' | 'priority' | 'category'> &
  Partial<Pick<Task, 'status' | 'position'>>;

export type TaskChanges = Partial<
  Pick<Task, 'title' | 'description' | 'due_date' | 'priority' | 'category' | 'status' | 'position'>
>;

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
}

export interface TaskWithDetails extends Task {
  subtasks: Subtask[];
  assignees: TaskAssigneeWithContact[];
}

/**
 * One entry of the "Move to" menu on a task card. The board decides which
 * columns a card may reach, the card only renders what it is handed.
 */
export interface TaskMoveTarget {
  status: TaskStatus;
  label: string;
  direction: 'up' | 'down';
}

/**
 * A request to put a task somewhere else, raised by dragging or by the menu.
 * Without a position the board appends the task to the end of its new column.
 */
export interface TaskMoveRequest {
  task: TaskWithDetails;
  status: TaskStatus;
  position?: number;
}

export type NewSubtask = Pick<Subtask, 'task_id' | 'title'> &
  Partial<Pick<Subtask, 'is_completed' | 'position'>>;

export type SubtaskChanges = Partial<Pick<Subtask, 'title' | 'is_completed' | 'position'>>;

export type NewTaskSubtask = Omit<NewSubtask, 'task_id'>;

export interface NewTaskWithDetails {
  task: NewTask;
  subtasks?: NewTaskSubtask[];
  contactIds?: string[];
}
