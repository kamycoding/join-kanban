import { Component, computed, input, output, signal } from '@angular/core';

import type {
  TaskCategory,
  TaskMoveRequest,
  TaskMoveTarget,
  TaskPriority,
  TaskWithDetails,
} from '../../../models/task';
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

const ARROW_ICONS: Record<TaskMoveTarget['direction'], string> = {
  up: '/img/icon-arrow-up.svg',
  down: '/img/icon-arrow-down.svg',
};

const MAX_VISIBLE_ASSIGNEES = 6;

@Component({
  selector: 'app-task-card',
  imports: [],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
  host: {
    '(document:click)': 'closeMenu()',
    '(keydown.escape)': 'closeMenu()',
  },
})
export class TaskCard {
  readonly task = input.required<TaskWithDetails>();
  readonly moveTargets = input<readonly TaskMoveTarget[]>([]);
  readonly openDetail = output<TaskWithDetails>();
  readonly moveRequested = output<TaskMoveRequest>();

  readonly menuOpen = signal(false);

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
  readonly visibleAssignees = computed(() => this.task().assignees.slice(0, MAX_VISIBLE_ASSIGNEES));
  readonly remainingAssigneeCount = computed(() =>
    Math.max(0, this.task().assignees.length - MAX_VISIBLE_ASSIGNEES),
  );

  activate(): void {
    this.openDetail.emit(this.task());
  }

  /**
   * Opens or closes the "Move to" menu. The click is kept inside the card so
   * the document listener that closes the menu does not swallow it right away.
   *
   * @param event - The click on the move button.
   */
  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  /**
   * Asks the board to move this task, and closes the menu.
   *
   * @param target - The column the user picked.
   */
  requestMove(target: TaskMoveTarget): void {
    this.closeMenu();
    this.moveRequested.emit({ task: this.task(), status: target.status });
  }

  arrowIcon(target: TaskMoveTarget): string {
    return ARROW_ICONS[target.direction];
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
