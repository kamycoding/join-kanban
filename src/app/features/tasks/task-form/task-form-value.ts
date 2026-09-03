import type { TaskCategory, TaskPriority } from '../../../models/task';

export type TaskFormMode = 'create' | 'edit';

export type TaskFormSubtaskValue =
  | {
      kind: 'existing';
      id: string;
      title: string;
      isCompleted: boolean;
    }
  | {
      kind: 'new';
      clientId: string;
      title: string;
      isCompleted: false;
    };

export interface TaskFormValue {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  category: TaskCategory | '';
  contactIds: string[];
  subtasks: TaskFormSubtaskValue[];
}

export function createEmptyTaskFormValue(): TaskFormValue {
  return {
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    category: '',
    contactIds: [],
    subtasks: [],
  };
}

/** Creates an isolated form value without copying framework-owned metadata. */
export function cloneTaskFormValue(value: TaskFormValue): TaskFormValue {
  return {
    ...value,
    contactIds: [...value.contactIds],
    subtasks: value.subtasks.map(cloneSubtask),
  };
}

function cloneSubtask(subtask: TaskFormSubtaskValue): TaskFormSubtaskValue {
  if (subtask.kind === 'existing') {
    return {
      kind: 'existing',
      id: subtask.id,
      title: subtask.title,
      isCompleted: subtask.isCompleted,
    };
  }

  return { kind: 'new', clientId: subtask.clientId, title: subtask.title, isCompleted: false };
}
