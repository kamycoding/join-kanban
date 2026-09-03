import type {
  NewTask,
  NewTaskSubtask,
  NewTaskWithDetails,
  TaskCategory,
  TaskStatus,
} from '../../../models/task';
import type { TaskFormSubtaskValue, TaskFormValue } from './task-form-value';

/**
 * Maps a validated create-mode form value to the task aggregate create contract.
 * The status defaults to the To-do column; the board hands in the column its
 * overlay was opened for.
 */
export function toNewTaskWithDetails(
  value: TaskFormValue,
  status: TaskStatus = 'todo',
): NewTaskWithDetails {
  return {
    task: toNewTask(value, status),
    contactIds: [...new Set(value.contactIds)],
    subtasks: value.subtasks.map(toNewSubtask),
  };
}

function toNewTask(value: TaskFormValue, status: TaskStatus): NewTask {
  return {
    title: value.title.trim(),
    description: value.description.trim(),
    due_date: value.dueDate,
    priority: value.priority,
    category: requireTaskCategory(value.category),
    status,
  };
}

function toNewSubtask(subtask: TaskFormSubtaskValue, position: number): NewTaskSubtask {
  return {
    title: subtask.title.trim(),
    is_completed: subtask.isCompleted,
    position,
  };
}

function requireTaskCategory(value: string): TaskCategory {
  if (value === 'user_story' || value === 'technical_task') return value;
  throw new Error('A valid task category is required.');
}
