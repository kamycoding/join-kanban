import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { TaskWithDetails } from '../../../models/task';
import { TaskDetail } from './task-detail';
import { createAssignee, createSubtask, createTask } from './task-detail-test-helpers';

describe('TaskDetail', () => {
  let component: TaskDetail;
  let fixture: ComponentFixture<TaskDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskDetail] }).compileComponents();
    fixture = TestBed.createComponent(TaskDetail);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('creates the component', () => {
    renderTask(createTask());
    expect(component).toBeTruthy();
  });

  it.each([
    ['user_story', 'User Story'],
    ['technical_task', 'Technical Task'],
  ] as const)('renders the %s category label', (category, label) => {
    renderTask(createTask({ category }));
    expect(element<HTMLElement>('.task-detail__category').textContent).toContain(label);
  });

  it('renders the full task title', () => {
    const title = 'A complete task title that must remain available '.repeat(4).trim();
    renderTask(createTask({ title }));
    expect(element<HTMLElement>('.task-detail__title').textContent?.trim()).toBe(title);
  });

  it('renders the full description', () => {
    const description = 'A complete task description that must not be clamped. '.repeat(8).trim();
    renderTask(createTask({ description }));
    expect(element<HTMLElement>('.task-detail__description').textContent?.trim()).toBe(description);
  });

  it.each([
    ['2026-08-30', '30/08/2026'],
    ['2024-02-29', '29/02/2024'],
    ['2026-04-30', '30/04/2026'],
  ])('formats the valid due date %s as %s', (dueDate, expected) => {
    renderTask(createTask({ due_date: dueDate }));
    expect(element<HTMLElement>('.task-detail__fact dd').textContent?.trim()).toBe(expected);
  });

  it.each(['2026-99-99', '2026-02-31', '2025-02-29', '2026-08-30junk', ''])(
    'leaves the invalid or unsupported due date %j unchanged',
    (dueDate) => {
      renderTask(createTask({ due_date: dueDate }));
      expect(element<HTMLElement>('.task-detail__fact dd').textContent?.trim()).toBe(dueDate);
    },
  );

  it.each([
    ['low', 'Low', '/img/icon-priority-low.svg'],
    ['medium', 'Medium', '/img/icon-priority-medium.svg'],
    ['urgent', 'Urgent', '/img/icon-priority-urgent.svg'],
  ] as const)('renders %s priority', (priority, label, icon) => {
    renderTask(createTask({ priority }));
    const priorityElement = element<HTMLElement>('.task-detail__priority');
    expect(priorityElement.textContent).toContain(label);
    expect(priorityElement.querySelector('img')?.getAttribute('src')).toBe(icon);
  });

  it('renders assigned contacts with avatar, initials, name, and contact color', () => {
    renderTask(
      createTask({ assignees: [createAssignee('contact-1', 'Anna', 'Schmidt', '#ff7a00')] }),
    );
    expect(element<HTMLElement>('.task-detail__avatar').textContent?.trim()).toBe('AS');
    expect(element<HTMLElement>('.task-detail__avatar').style.backgroundColor).toBe(
      'rgb(255, 122, 0)',
    );
    expect(element<HTMLElement>('.task-detail__contact-name').textContent).toContain(
      'Anna Schmidt',
    );
  });

  it('extracts initials without splitting a Unicode code point', () => {
    renderTask(
      createTask({
        assignees: [createAssignee('contact-1', '\u{1f600}lex', 'Schmidt', '#ff7a00')],
      }),
    );
    expect(element<HTMLElement>('.task-detail__avatar').textContent?.trim()).toBe('\u{1f600}S');
  });

  it('handles zero assignees', () => {
    renderTask(createTask({ assignees: [] }));
    expect(fixture.nativeElement.querySelectorAll('.task-detail__avatar')).toHaveLength(0);
    expect(element<HTMLElement>('.task-detail__empty').textContent).toContain(
      'No contacts assigned',
    );
  });

  it('renders every subtask', () => {
    renderTask(
      createTask({
        subtasks: [createSubtask('First subtask', false), createSubtask('Second', true)],
      }),
    );
    expect(fixture.nativeElement.querySelectorAll('.task-detail__subtasks li')).toHaveLength(2);
    expect(element<HTMLElement>('.task-detail__subtasks').textContent).toContain('First subtask');
  });

  it('renders a completed subtask as checked', () => {
    renderTask(createTask({ subtasks: [createSubtask('Complete', true)] }));
    expect(element<HTMLInputElement>('.task-detail__subtasks input').checked).toBe(true);
  });

  it('renders an incomplete subtask as unchecked', () => {
    renderTask(createTask({ subtasks: [createSubtask('Incomplete', false)] }));
    expect(element<HTMLInputElement>('.task-detail__subtasks input').checked).toBe(false);
  });

  it('emits the requested subtask state without mutating the task', () => {
    const task = createTask({ subtasks: [createSubtask('Toggle me', false)] });
    const emitted = vi.fn();
    component.subtaskToggleRequested.subscribe(emitted);
    renderTask(task);
    const checkbox = element<HTMLInputElement>('.task-detail__subtasks input');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(emitted).toHaveBeenCalledWith({ subtaskId: task.subtasks[0].id, isCompleted: true });
    expect(task.subtasks[0].is_completed).toBe(false);
  });

  it('emits closeRequested from the close button', () => {
    const emitted = vi.fn();
    component.closeRequested.subscribe(emitted);
    renderTask(createTask());
    element<HTMLButtonElement>('.task-detail__close').click();
    expect(emitted).toHaveBeenCalledOnce();
  });

  it('emits the current task from editRequested', () => {
    const task = createTask();
    const emitted = vi.fn();
    component.editRequested.subscribe(emitted);
    renderTask(task);
    actionButton('Edit').click();
    expect(emitted).toHaveBeenCalledWith(task);
  });

  it('emits the current task from deleteRequested', () => {
    const task = createTask();
    const emitted = vi.fn();
    component.deleteRequested.subscribe(emitted);
    renderTask(task);
    actionButton('Delete').click();
    expect(emitted).toHaveBeenCalledWith(task);
  });

  it('renders an explicit empty subtasks state', () => {
    renderTask(createTask({ subtasks: [] }));
    expect(fixture.nativeElement.querySelector('.task-detail__subtasks')).toBeNull();
    expect(Array.from(fixture.nativeElement.querySelectorAll('.task-detail__empty'))).toHaveLength(
      2,
    );
    expect(fixture.nativeElement.textContent).toContain('No subtasks');
  });

  it('keeps long title, description, contact, and subtask text in the DOM', () => {
    const longText = 'Long Unicode-safe content \u{1f680} '.repeat(20).trim();
    renderTask(
      createTask({
        title: longText,
        description: longText,
        assignees: [createAssignee('contact-1', longText, 'Surname', '#0038ff')],
        subtasks: [createSubtask(longText, false)],
      }),
    );
    expect(element<HTMLElement>('.task-detail__title').textContent?.trim()).toBe(longText);
    expect(element<HTMLElement>('.task-detail__description').textContent?.trim()).toBe(longText);
    expect(element<HTMLElement>('.task-detail__contact-name').textContent).toContain(longText);
    expect(element<HTMLElement>('.task-detail__subtasks').textContent).toContain(longText);
  });

  function renderTask(task: TaskWithDetails): void {
    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();
  }

  function element<T extends Element>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  function actionButton(label: string): HTMLButtonElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '.task-detail__actions button',
      ) as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === label) as HTMLButtonElement;
  }
});
