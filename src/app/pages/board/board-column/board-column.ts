import { Component, input, output } from '@angular/core';

import { TaskWithDetails } from '../../../models/task';

@Component({
  selector: 'app-board-column',
  imports: [],
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
})
export class BoardColumn {
  readonly heading = input.required<string>();
  readonly tasks = input.required<TaskWithDetails[]>();

  readonly addRequested = output<void>();
}
