import { Component, OnInit, computed, inject } from '@angular/core';

import { TaskStatus, TaskWithDetails } from '../../models/task';
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
  imports: [BoardColumn],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit {
  private readonly taskService = inject(TaskService);

  readonly columns = BOARD_COLUMNS;
  readonly loading = this.taskService.loading;
  readonly error = this.taskService.error;

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
}
