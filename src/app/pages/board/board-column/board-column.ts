import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, input, output } from '@angular/core';

import { TaskMoveRequest, TaskMoveTarget, TaskStatus, TaskWithDetails } from '../../../models/task';
import { TaskCard } from '../../../features/tasks/task-card/task-card';

@Component({
  selector: 'app-board-column',
  imports: [CdkDrag, CdkDropList, TaskCard],
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
})
export class BoardColumn {
  readonly heading = input.required<string>();
  readonly status = input.required<TaskStatus>();
  readonly tasks = input.required<TaskWithDetails[]>();
  readonly moveTargets = input<readonly TaskMoveTarget[]>([]);
  readonly dragDisabled = input(false);

  readonly addRequested = output<void>();
  readonly detailRequested = output<TaskWithDetails>();
  readonly moveRequested = output<TaskMoveRequest>();

  /**
   * Turns a drop into a plain move request, so the board never has to know
   * that the drag came from the CDK.
   *
   * @param event - The drop as reported by the CDK drop list.
   */
  dropped(event: CdkDragDrop<TaskWithDetails[]>): void {
    this.moveRequested.emit({
      task: event.item.data,
      status: this.status(),
      position: event.currentIndex,
    });
  }
}
