import type { TaskChanges, TaskWithDetails } from '../../../models/task';
import type { TaskFormSubtaskValue, TaskFormValue } from './task-form-value';

export interface TaskEditPlan {
  taskChanges: TaskChanges;
  assigneesToAdd: string[];
  assigneesToRemove: string[];
  subtasksToCreate: { title: string; position: number }[];
  subtasksToUpdate: { id: string; title: string }[];
  subtasksToDelete: string[];
}

/** Maps a task aggregate to an isolated, editable form value. */
export function toTaskFormValue(task: TaskWithDetails): TaskFormValue {
  return {
    title: task.title,
    description: task.description,
    dueDate: task.due_date,
    priority: task.priority,
    category: task.category,
    contactIds: task.assignees.map((assignee) => assignee.contact_id),
    subtasks: task.subtasks.map((subtask) => ({
      kind: 'existing',
      id: subtask.id,
      title: subtask.title,
      isCompleted: subtask.is_completed,
    })),
  };
}

/** Diffs a validated edit-mode form value against the original task aggregate. */
export function toTaskEditPlan(value: TaskFormValue, original: TaskWithDetails): TaskEditPlan {
  return {
    taskChanges: toTaskChanges(value, original),
    assigneesToAdd: toAddedContactIds(value.contactIds, original),
    assigneesToRemove: toRemovedContactIds(value.contactIds, original),
    ...toSubtaskPlan(value.subtasks, original),
  };
}

function toTaskChanges(value: TaskFormValue, original: TaskWithDetails): TaskChanges {
  const changes: TaskChanges = {};
  const title = value.title.trim();
  const description = value.description.trim();

  if (title !== original.title) changes.title = title;
  if (description !== original.description) changes.description = description;
  if (value.dueDate !== original.due_date) changes.due_date = value.dueDate;
  if (value.priority !== original.priority) changes.priority = value.priority;
  if (value.category !== '' && value.category !== original.category) {
    changes.category = value.category;
  }

  return changes;
}

function toAddedContactIds(contactIds: string[], original: TaskWithDetails): string[] {
  const originalIds = new Set(original.assignees.map((assignee) => assignee.contact_id));

  return [...new Set(contactIds)].filter((contactId) => !originalIds.has(contactId));
}

function toRemovedContactIds(contactIds: string[], original: TaskWithDetails): string[] {
  const submittedIds = new Set(contactIds);

  return original.assignees
    .map((assignee) => assignee.contact_id)
    .filter((contactId) => !submittedIds.has(contactId));
}

function toSubtaskPlan(
  subtasks: TaskFormSubtaskValue[],
  original: TaskWithDetails,
): Pick<TaskEditPlan, 'subtasksToCreate' | 'subtasksToUpdate' | 'subtasksToDelete'> {
  const originalById = new Map(original.subtasks.map((subtask) => [subtask.id, subtask]));

  return {
    subtasksToCreate: toSubtaskCreations(subtasks, original),
    subtasksToUpdate: toSubtaskUpdates(subtasks, originalById),
    subtasksToDelete: toSubtaskDeletions(subtasks, original),
  };
}

function toSubtaskCreations(
  subtasks: TaskFormSubtaskValue[],
  original: TaskWithDetails,
): TaskEditPlan['subtasksToCreate'] {
  const firstPosition =
    original.subtasks.reduce((max, subtask) => Math.max(max, subtask.position), -1) + 1;

  return subtasks
    .filter((subtask) => subtask.kind === 'new')
    .map((subtask, index) => ({ title: subtask.title.trim(), position: firstPosition + index }));
}

function toSubtaskUpdates(
  subtasks: TaskFormSubtaskValue[],
  originalById: Map<string, TaskWithDetails['subtasks'][number]>,
): TaskEditPlan['subtasksToUpdate'] {
  const updates: TaskEditPlan['subtasksToUpdate'] = [];

  for (const subtask of subtasks) {
    if (subtask.kind !== 'existing') continue;

    const originalSubtask = originalById.get(subtask.id);
    const title = subtask.title.trim();

    if (originalSubtask && originalSubtask.title !== title) {
      updates.push({ id: subtask.id, title });
    }
  }

  return updates;
}

function toSubtaskDeletions(
  subtasks: TaskFormSubtaskValue[],
  original: TaskWithDetails,
): TaskEditPlan['subtasksToDelete'] {
  const keptIds = new Set(
    subtasks.flatMap((subtask) => (subtask.kind === 'existing' ? [subtask.id] : [])),
  );

  return original.subtasks
    .filter((subtask) => !keptIds.has(subtask.id))
    .map((subtask) => subtask.id);
}
