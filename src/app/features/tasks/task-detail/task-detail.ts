import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import type { TaskCategory, TaskPriority, TaskWithDetails } from '../../../models/task';
import type { TaskAssigneeWithContact } from '../../../models/task-assignee';

let taskDetailInstanceCounter = 0;

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  user_story: 'User Story',
  technical_task: 'Technical Task',
};

const PRIORITY_DETAILS: Record<TaskPriority, { label: string; icon: string }> = {
  low: { label: 'Low', icon: '/img/icon-priority-low.svg' },
  medium: { label: 'Medium', icon: '/img/icon-priority-medium.svg' },
  urgent: { label: 'Urgent', icon: '/img/icon-priority-urgent.svg' },
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Component({
  selector: 'app-task-detail',
  imports: [],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
})
export class TaskDetail {
  readonly task = input.required<TaskWithDetails>();

  readonly closeRequested = output<void>();
  readonly editRequested = output<TaskWithDetails>();
  readonly deleteRequested = output<TaskWithDetails>();
  readonly subtaskToggleRequested = output<{ subtaskId: string; isCompleted: boolean }>();

  private readonly instanceId = ++taskDetailInstanceCounter;
  readonly titleId = `task-detail-title-${this.instanceId}`;
  readonly assignedToTitleId = `task-detail-assignees-title-${this.instanceId}`;
  readonly subtasksTitleId = `task-detail-subtasks-title-${this.instanceId}`;

  readonly categoryLabel = computed(() => CATEGORY_LABELS[this.task().category]);
  readonly priority = computed(() => PRIORITY_DETAILS[this.task().priority]);
  readonly formattedDueDate = computed(() => this.formatDate(this.task().due_date));

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  private readonly previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  private restoreFocusOnDestroy = true;

  /**
   * Initializes the instance and registers its required lifecycle behavior.
   */
  constructor() {
    afterNextRender(() => this.closeButton().nativeElement.focus());

    inject(DestroyRef).onDestroy(() => {
      if (this.restoreFocusOnDestroy) {
        this.restorePreviousFocus();
      }
    });
  }

  /**
   * Requests close.
   */
  requestClose(): void {
    this.closeRequested.emit();
  }

  /**
   * Requests edit.
   */
  requestEdit(): void {
    this.restoreFocusOnDestroy = false;
    this.editRequested.emit(this.task());
  }

  /**
   * Requests delete.
   */
  requestDelete(): void {
    this.restoreFocusOnDestroy = false;
    this.deleteRequested.emit(this.task());
  }

  /**
   * Restores previous focus.
   */
  private restorePreviousFocus(): void {
    const target = this.previouslyFocused;

    if (target && target.isConnected && typeof target.focus === 'function') {
      target.focus();
    }
  }

  /**
   * Handles a click on the overlay backdrop.
   *
   * @param event - The event to handle.
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  /**
   * Handles subtask toggle.
   *
   * @param subtaskId - The identifier of the affected subtask.
   * @param event - The event to handle.
   */
  onSubtaskToggle(subtaskId: string, event: Event): void {
    const checkbox = event.currentTarget as HTMLInputElement;

    this.subtaskToggleRequested.emit({ subtaskId, isCompleted: checkbox.checked });
  }

  /**
   * Returns an assigned contact's display initials.
   *
   * @param assignment - The contact assignment to process.
   * @returns The resulting string.
   */
  contactInitials(assignment: TaskAssigneeWithContact): string {
    const { first_name, last_name } = assignment.contact;

    return `${this.firstCharacter(first_name)}${this.firstCharacter(last_name)}`.toUpperCase();
  }

  /**
   * Returns an assigned contact's full name.
   *
   * @param assignment - The contact assignment to process.
   * @returns The resulting string.
   */
  contactFullName(assignment: TaskAssigneeWithContact): string {
    const { first_name, last_name } = assignment.contact;
    const fullName = `${first_name.trim()} ${last_name.trim()}`.trim();

    return fullName || 'Unnamed contact';
  }

  /**
   * Handles keyboard input at document level.
   *
   * @param event - The event to handle.
   */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }

    if (event.key === 'Tab') {
      this.containTabFocus(event);
    }
  }

  /**
   * Keeps document focus inside the active dialog.
   *
   * @param event - The event to handle.
   */
  @HostListener('document:focusin', ['$event'])
  onDocumentFocus(event: FocusEvent): void {
    const dialog = this.dialog().nativeElement;

    if (event.target instanceof Node && !dialog.contains(event.target)) {
      this.closeButton().nativeElement.focus();
    }
  }

  /**
   * Keeps focus within tab focus.
   *
   * @param event - The event to handle.
   */
  private containTabFocus(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.dialog().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      event.preventDefault();
      this.closeButton().nativeElement.focus();
    } else if (
      event.shiftKey &&
      (document.activeElement === first || !this.isFocusInsideDialog())
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !this.isFocusInsideDialog())
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  /**
   * Determines whether focus is currently inside the dialog.
   *
   * @returns Whether the requested condition is met.
   */
  private isFocusInsideDialog(): boolean {
    return this.dialog().nativeElement.contains(document.activeElement);
  }

  /**
   * Formats date.
   *
   * @param value - The value to process.
   * @returns The resulting string.
   */
  private formatDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return value;
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    return this.isValidCalendarDate(year, month, day)
      ? `${dayText}/${monthText}/${yearText}`
      : value;
  }

  /**
   * Determines whether the supplied parts form a valid calendar date.
   *
   * @param year - The year to check.
   * @param month - The month to check.
   * @param day - The day to check.
   * @returns Whether the requested condition is met.
   */
  private isValidCalendarDate(year: number, month: number, day: number): boolean {
    const daysPerMonth = [
      31,
      this.isLeapYear(year) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];

    return month >= 1 && month <= 12 && day >= 1 && day <= daysPerMonth[month - 1];
  }

  /**
   * Determines whether a year is a leap year.
   *
   * @param year - The year to check.
   * @returns Whether the requested condition is met.
   */
  private isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  /**
   * Returns the first character of a value in uppercase.
   *
   * @param value - The value to process.
   * @returns The resulting string.
   */
  private firstCharacter(value: string): string {
    return Array.from(value.trim())[0] ?? '';
  }
}
