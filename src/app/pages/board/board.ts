import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { TaskDetail } from '../../features/tasks/task-detail/task-detail';
import { TaskMoveRequest, TaskMoveTarget, TaskStatus, TaskWithDetails } from '../../models/task';
import { SubtaskService } from '../../services/subtask';
import { TaskService } from '../../services/task';
import { Overlay } from '../../shared/components/overlay/overlay';
import { Toast } from '../../shared/components/toast/toast';
import { AddTask } from '../add-task/add-task';
import { BoardColumn } from './board-column/board-column';

interface BoardColumnDefinition {
  status: TaskStatus;
  heading: string;
}

const BOARD_COLUMNS: readonly BoardColumnDefinition[] = [
  { status: 'todo', heading: 'To do' },
  { status: 'in_progress', heading: 'In progress' },
  { status: 'await_feedback', heading: 'Await feedback' },
  { status: 'done', heading: 'Done' },
];

/**
 * The "Move to" menu offers the neighbouring columns only, one up and one
 * down, which is what the design shows. The outer columns therefore have a
 * single entry each.
 */
const MOVE_TARGETS: ReadonlyMap<TaskStatus, readonly TaskMoveTarget[]> = new Map(
  BOARD_COLUMNS.map((column, index) => {
    const previous = BOARD_COLUMNS[index - 1];
    const next = BOARD_COLUMNS[index + 1];
    const targets: TaskMoveTarget[] = [];

    if (previous) {
      targets.push({ status: previous.status, label: previous.heading, direction: 'up' });
    }

    if (next) {
      targets.push({ status: next.status, label: next.heading, direction: 'down' });
    }

    return [column.status, targets];
  }),
);

/**
 * Whether a task belongs in the result for a search term. Title and
 * description count, and the term arrives trimmed and in lower case.
 *
 * @param task - The task to check.
 * @param term - The lower case search term.
 */
function matchesSearch(task: TaskWithDetails, term: string): boolean {
  return task.title.toLowerCase().includes(term) || task.description.toLowerCase().includes(term);
}

/**
 * Below this width the design has no overlay but a full Add-task page, so the
 * plus buttons navigate there instead of opening the form in place. Mirrors
 * `$bp-mobile` in `src/styles/_breakpoints.scss`.
 */
const OVERLAY_MIN_WIDTH = 768;

@Component({
  selector: 'app-board',
  imports: [AddTask, BoardColumn, CdkDropListGroup, Overlay, TaskDetail, Toast],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly subtaskService = inject(SubtaskService);
  private readonly router = inject(Router);

  readonly columns = BOARD_COLUMNS;
  readonly loading = this.taskService.loading;
  readonly error = this.taskService.error;
  readonly searchTerm = signal('');
  readonly selectedTaskId = signal<string | null>(null);
  readonly formStatus = signal<TaskStatus | null>(null);
  readonly createdToast = signal(false);

  /**
   * While the board is filtered the columns no longer show every card, so a
   * drop would report a slot counted among the visible ones only. Dragging is
   * therefore off during a search; the "Move to" menu still works because it
   * appends to the end of a column and needs no slot.
   */
  readonly dragDisabled = computed(() => this.searchTerm().trim().length > 0);
  readonly selectedTask = computed(
    () => this.taskService.tasks().find((task) => task.id === this.selectedTaskId()) ?? null,
  );

  private readonly tasksByStatus = computed(() => {
    const groups = new Map<TaskStatus, TaskWithDetails[]>(
      BOARD_COLUMNS.map((column) => [column.status, []]),
    );
    const term = this.searchTerm().trim().toLowerCase();

    for (const task of this.taskService.tasks()) {
      if (term && !matchesSearch(task, term)) {
        continue;
      }

      groups.get(task.status)?.push(task);
    }

    return groups;
  });

  async ngOnInit(): Promise<void> {
    await this.taskService.getTasks();
  }

  /**
   * Keeps the search term in step with the input field.
   *
   * @param event - The input event of the search field.
   */
  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  tasksFor(status: TaskStatus): TaskWithDetails[] {
    return this.tasksByStatus().get(status) ?? [];
  }

  /**
   * Opens the detail overlay for the given task.
   *
   * @param task - The task whose details should be shown.
   */
  openDetail(task: TaskWithDetails): void {
    this.selectedTaskId.set(task.id);
  }

  /**
   * Closes the detail overlay.
   */
  closeDetail(): void {
    this.selectedTaskId.set(null);
  }

  /**
   * Deletes a task and closes the detail overlay when it worked.
   *
   * @param task - The task to delete.
   */
  async deleteTask(task: TaskWithDetails): Promise<void> {
    const deleted = await this.taskService.deleteTask(task.id);

    if (deleted) {
      this.closeDetail();
    }
  }

  /**
   * Opens the task form for a column. On a narrow screen the design has no
   * overlay, so the plus button leads to the Add-task page instead and carries
   * the column along as a query parameter.
   *
   * @param status - The column whose plus button was used.
   */
  async openForm(status: TaskStatus): Promise<void> {
    if (window.innerWidth < OVERLAY_MIN_WIDTH) {
      await this.router.navigate(['/add-task'], { queryParams: { status } });
      return;
    }

    this.createdToast.set(false);
    this.formStatus.set(status);
  }

  closeForm(): void {
    this.formStatus.set(null);
  }

  /**
   * Closes the form once a task was created and confirms it, the way the
   * design shows after adding from the board.
   */
  onTaskCreated(): void {
    this.closeForm();
    this.createdToast.set(true);
  }

  /**
   * The columns a card in this column may be moved to, one up and one down.
   *
   * @param status - The column the card currently sits in.
   */
  moveTargetsFor(status: TaskStatus): readonly TaskMoveTarget[] {
    return MOVE_TARGETS.get(status) ?? [];
  }

  /**
   * Moves a task and saves that through the task service. Dragging carries a
   * slot, the menu does not and appends to the end. A task that ends up where
   * it already was is ignored, and a rejected move is taken back by the
   * service, which also fills the error message.
   *
   * @param request - The task, the column it should land in, and its slot.
   */
  async moveTask(request: TaskMoveRequest): Promise<void> {
    const { task, status } = request;
    // The menu appends to the end of the whole column, which is not the same
    // as the end of what a search leaves visible. Dragging always carries its
    // own slot and never runs while the board is filtered.
    const position =
      request.position ??
      this.taskService.tasks().filter((other) => other.status === status).length;
    const currentIndex = this.tasksFor(task.status).findIndex((other) => other.id === task.id);

    if (task.status === status && currentIndex === position) {
      return;
    }

    await this.taskService.moveTask(task.id, status, position);
  }

  /**
   * Saves the new state of a subtask and shows it on the board right away.
   *
   * @param change - Id of the subtask and whether it is completed now.
   */
  async toggleSubtask(change: { subtaskId: string; isCompleted: boolean }): Promise<void> {
    const updated = await this.subtaskService.setSubtaskCompleted(
      change.subtaskId,
      change.isCompleted,
    );

    if (updated) {
      this.taskService.applySubtaskChange(updated);
    }
  }
}
