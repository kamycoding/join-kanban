import { Contact } from './contact';

export interface TaskAssignee {
  task_id: string;
  contact_id: string;
  created_at: string;
}

export type NewTaskAssignee = Pick<TaskAssignee, 'task_id' | 'contact_id'>;

export interface TaskAssigneeWithContact extends TaskAssignee {
  contact: Contact;
}
