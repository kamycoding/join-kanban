import {
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
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

  constructor() {
    afterNextRender(() => this.closeButton().nativeElement.focus());
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  requestEdit(): void {
    this.editRequested.emit(this.task());
  }

  requestDelete(): void {
    this.deleteRequested.emit(this.task());
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  onSubtaskToggle(subtaskId: string, event: Event): void {
    const checkbox = event.currentTarget as HTMLInputElement;

    this.subtaskToggleRequested.emit({ subtaskId, isCompleted: checkbox.checked });
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

  @HostListener('document:focusin', ['$event'])
  onDocumentFocus(event: FocusEvent): void {
    const dialog = this.dialog().nativeElement;

    if (event.target instanceof Node && !dialog.contains(event.target)) {
      this.closeButton().nativeElement.focus();
    }
  }

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

  private isFocusInsideDialog(): boolean {
    return this.dialog().nativeElement.contains(document.activeElement);
  }

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

  private isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  private firstCharacter(value: string): string {
    return Array.from(value.trim())[0] ?? '';
  }
}
