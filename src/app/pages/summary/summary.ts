import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TASK_STATUSES, TaskStatus } from '../../models/task';
import { TaskService } from '../../services/task';

/**
 * The local calendar day as YYYY-MM-DD. Due dates carry that same shape, so
 * comparing them as plain text keeps time zones out of the question: a date
 * turned into a Date object would be midnight UTC and could fall a day back.
 */
function localDay(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** October 16, 2026 - the wording the design puts on the urgency card. */
const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

/**
 * Reads a due date without going through the DatePipe: the pipe pulls
 * Angular's date formatting into the initial bundle and pushes it past its
 * budget. Building the Date from the three parts keeps it on the local day.
 */
function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return dayFormat.format(new Date(year, month - 1, date));
}

@Component({
  selector: 'app-summary',
  imports: [RouterLink],
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary implements OnInit {
  private readonly taskService = inject(TaskService);

  readonly loading = this.taskService.loading;
  readonly error = this.taskService.error;

  /**
   * One pass over the tasks fills every status counter, so the four status
   * cards do not each walk the list on their own.
   */
  private readonly countByStatus = computed(() => {
    const counts = new Map<TaskStatus, number>(TASK_STATUSES.map((status) => [status, 0]));

    for (const task of this.taskService.tasks()) {
      counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
    }

    return counts;
  });

  readonly todoCount = computed(() => this.countByStatus().get('todo') ?? 0);
  readonly inProgressCount = computed(() => this.countByStatus().get('in_progress') ?? 0);
  readonly awaitFeedbackCount = computed(() => this.countByStatus().get('await_feedback') ?? 0);
  readonly doneCount = computed(() => this.countByStatus().get('done') ?? 0);

  /** Every task on the board, whatever its column. */
  readonly totalCount = computed(() => this.taskService.tasks().length);

  readonly urgentCount = computed(
    () => this.taskService.tasks().filter((task) => task.priority === 'urgent').length,
  );

  /**
   * The earliest due date still ahead of the board, or null when nothing is
   * due. A task in Done has been dealt with and no longer sets a deadline,
   * and a task due today still counts as upcoming.
   */
  readonly nextDeadline = computed(() => {
    const today = localDay(new Date());

    return this.taskService
      .tasks()
      .filter((task) => task.status !== 'done' && task.due_date >= today)
      .reduce<string | null>(
        (earliest, task) =>
          earliest === null || task.due_date < earliest ? task.due_date : earliest,
        null,
      );
  });

  /** The deadline as the card shows it, null while nothing is due. */
  readonly nextDeadlineLabel = computed(() => {
    const day = this.nextDeadline();

    return day === null ? null : formatDay(day);
  });

  async ngOnInit(): Promise<void> {
    await this.taskService.getTasks();
  }
}
