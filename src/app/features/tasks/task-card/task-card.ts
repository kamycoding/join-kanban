import { Component, computed, input, output } from '@angular/core';

import type { TaskCategory, TaskPriority, TaskWithDetails } from '../../../models/task';
import type { TaskAssigneeWithContact } from '../../../models/task-assignee';

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  user_story: 'User Story',
  technical_task: 'Technical Task',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  urgent: 'Urgent',
};

const PRIORITY_ICONS: Record<TaskPriority, string> = {
  low: '/img/icon-priority-low.svg',
  medium: '/img/icon-priority-medium.svg',
  urgent: '/img/icon-priority-urgent.svg',
};

@Component({
  selector: 'app-task-card',
  imports: [],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCard {
  readonly task = input.required<TaskWithDetails>();
  readonly openDetail = output<TaskWithDetails>();

  readonly categoryLabel = computed(() => CATEGORY_LABELS[this.task().category]);
  readonly completedSubtasks = computed(
    () => this.task().subtasks.filter((subtask) => subtask.is_completed).length,
  );
  readonly totalSubtasks = computed(() => this.task().subtasks.length);
  readonly progressPercentage = computed(() => {
    const total = this.totalSubtasks();

    return total === 0 ? 0 : (this.completedSubtasks() / total) * 100;
  });
  readonly priorityLabel = computed(() => PRIORITY_LABELS[this.task().priority]);
  readonly priorityIcon = computed(() => PRIORITY_ICONS[this.task().priority]);
  readonly accessibleName = computed(() => `Open task details for ${this.task().title}.`);

  activate(): void {
    this.openDetail.emit(this.task());
  }

  contactInitials(assignment: TaskAssigneeWithContact): string {
    const { first_name, last_name } = assignment.contact;

    return `${this.firstCharacter(first_name)}${this.firstCharacter(last_name)}`.toUpperCase();
  }

  contactFullName(assignment: TaskAssigneeWithContact): string {
    const { first_name, last_name } = assignment.contact;
    const fullName = `${first_name.trim()} ${last_name.trim()}`.trim();

    return fullName || 'Unnamed contact';
  }

  private firstCharacter(value: string): string {
    return Array.from(value.trim())[0] ?? '';
  }
}
