import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { TaskDetail } from '../../features/tasks/task-detail/task-detail';
import { TaskStatus, TaskWithDetails } from '../../models/task';
import { SubtaskService } from '../../services/subtask';
import { TaskService } from '../../services/task';
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

@Component({
  selector: 'app-board',
  imports: [BoardColumn, TaskDetail],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly subtaskService = inject(SubtaskService);

  readonly columns = BOARD_COLUMNS;
  readonly loading = this.taskService.loading;
  readonly error = this.taskService.error;
  readonly selectedTaskId = signal<string | null>(null);
  readonly selectedTask = computed(
    () => this.taskService.tasks().find((task) => task.id === this.selectedTaskId()) ?? null,
  );

  private readonly tasksByStatus = computed(() => {
    const groups = new Map<TaskStatus, TaskWithDetails[]>(
      BOARD_COLUMNS.map((column) => [column.status, []]),
    );

    for (const task of this.taskService.tasks()) {
      groups.get(task.status)?.push(task);
    }

    return groups;
  });

  async ngOnInit(): Promise<void> {
    await this.taskService.getTasks();
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
