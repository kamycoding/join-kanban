import { Component, input, output } from '@angular/core';

import { TaskStatus, TaskWithDetails } from '../../../models/task';
import { TaskCard } from '../../../features/tasks/task-card/task-card';

@Component({
  selector: 'app-board-column',
  imports: [TaskCard],
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
})
export class BoardColumn {
  readonly heading = input.required<string>();
  readonly status = input.required<TaskStatus>();
  readonly tasks = input.required<TaskWithDetails[]>();

  readonly addRequested = output<void>();
  readonly detailRequested = output<TaskWithDetails>();
}
