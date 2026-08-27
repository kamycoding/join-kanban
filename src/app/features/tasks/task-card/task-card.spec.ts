import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { Subtask, TaskWithDetails } from '../../../models/task';
import type { TaskAssigneeWithContact } from '../../../models/task-assignee';
import { TaskCard } from './task-card';

describe('TaskCard', () => {
  let component: TaskCard;
  let fixture: ComponentFixture<TaskCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCard],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    renderTask(createTask());

    expect(component).toBeTruthy();
  });

  it.each([
    ['user_story', 'User Story'],
    ['technical_task', 'Technical Task'],
  ] as const)('renders the %s category', (category, label) => {
    renderTask(createTask({ category }));

    expect(element<HTMLElement>('.task-card__category').textContent).toContain(label);
  });

  it('renders the task title and description', () => {
    renderTask(createTask({ title: 'Build the card', description: 'Follow the Figma design.' }));

    expect(element<HTMLElement>('.task-card__title').textContent).toContain('Build the card');
    expect(element<HTMLElement>('.task-card__description').textContent).toContain(
      'Follow the Figma design.',
    );
  });

  it('does not render an empty description', () => {
    renderTask(createTask({ description: '   ' }));

    expect(fixture.nativeElement.querySelector('.task-card__description')).toBeNull();
  });

  it('renders a long title without changing its content', () => {
    const title = 'Very long task title '.repeat(12).trim();
    renderTask(createTask({ title }));

    expect(element<HTMLButtonElement>('.task-card__open').textContent?.trim()).toBe(title);
  });

  it('renders a long description without changing its content', () => {
    const description = 'Very long task description '.repeat(20).trim();
    const task = createTask({ description });
    renderTask(task);

    expect(component.task().description).toBe(description);
    expect(element<HTMLElement>('.task-card__description').textContent?.trim()).toBe(description);
  });

  it.each([
    ['urgent', '/img/icon-priority-urgent.svg', 'Urgent priority'],
    ['medium', '/img/icon-priority-medium.svg', 'Medium priority'],
    ['low', '/img/icon-priority-low.svg', 'Low priority'],
  ] as const)('renders the %s priority', (priority, icon, accessibleMeaning) => {
    renderTask(createTask({ priority }));

    const priorityImage = element<HTMLImageElement>('.task-card__priority');

    expect(priorityImage.getAttribute('src')).toBe(icon);
    expect(priorityImage.getAttribute('alt')).toBe(accessibleMeaning);
  });

  it('renders partial subtask progress', () => {
    renderTask(
      createTask({
        subtasks: [createSubtask('First', true), createSubtask('Second', false)],
      }),
    );

    expect(component.completedSubtasks()).toBe(1);
    expect(component.totalSubtasks()).toBe(2);
    expect(element<HTMLElement>('.task-card__subtask-count').textContent).toContain('1/2 Subtasks');
    expect(element<HTMLProgressElement>('.task-card__progress').value).toBe(50);
    expect(element<HTMLElement>('.task-card').classList).not.toContain(
      'task-card--without-subtasks',
    );
  });

  it('renders all-complete subtask progress at 100 percent', () => {
    renderTask(
      createTask({
        subtasks: [
          createSubtask('First', true),
          createSubtask('Second', true),
          createSubtask('Third', true),
        ],
      }),
    );

    const progress = element<HTMLProgressElement>('.task-card__progress');

    expect(component.progressPercentage()).toBe(100);
    expect(progress.value).toBe(100);
    expect(progress.max).toBe(100);
    expect(element<HTMLElement>('.task-card__subtask-count').textContent).toContain('3/3 Subtasks');
  });

  it('hides subtask progress and keeps a valid percentage when there are no subtasks', () => {
    renderTask(createTask({ subtasks: [] }));

    expect(fixture.nativeElement.querySelector('.task-card__subtasks')).toBeNull();
    expect(component.progressPercentage()).toBe(0);
    expect(Number.isFinite(component.progressPercentage())).toBe(true);
    expect(element<HTMLElement>('.task-card').classList).toContain('task-card--without-subtasks');
  });

  it('renders assigned contact initials and colors', () => {
    renderTask(
      createTask({
        assignees: [createAssignee('contact-1', 'Anna', 'Schmidt', '#ff7a00')],
      }),
    );

    const avatar = element<HTMLElement>('.task-card__avatar');

    expect(avatar.textContent).toContain('AS');
    expect(avatar.style.backgroundColor).toBe('rgb(255, 122, 0)');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Anna Schmidt');
  });

  it('handles zero assigned contacts', () => {
    renderTask(createTask({ assignees: [] }));

    expect(fixture.nativeElement.querySelector('.task-card__assignees')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.task-card__avatar')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.task-card__priority')).toBeTruthy();
  });

  it('renders multiple assigned contacts', () => {
    renderTask(
      createTask({
        assignees: [
          createAssignee('contact-1', 'Anna', 'Schmidt', '#ff7a00'),
          createAssignee('contact-2', 'Ben', 'Meyer', '#0038ff'),
          createAssignee('contact-3', 'Cara', 'Ng', '#1fd7c1'),
        ],
      }),
    );

    const avatars = fixture.nativeElement.querySelectorAll('.task-card__avatar');

    expect(avatars).toHaveLength(3);
    expect(
      Array.from(avatars, (avatar: Element) =>
        avatar.querySelector('[aria-hidden="true"]')?.textContent?.trim(),
      ),
    ).toEqual(['AS', 'BM', 'CN']);
  });

  it('renders a large assignee collection without dropping contacts', () => {
    const assignees = Array.from({ length: 12 }, (_, index) =>
      createAssignee(`contact-${index}`, `First${index}`, `Last${index}`, '#462f8a'),
    );
    renderTask(createTask({ assignees }));

    expect(fixture.nativeElement.querySelectorAll('.task-card__avatar')).toHaveLength(12);
    expect(fixture.nativeElement.querySelectorAll('.task-card__avatar-name')).toHaveLength(12);
  });

  it('builds initials when the first name is missing', () => {
    renderTask(createTask({ assignees: [createAssignee('contact-1', '', 'Schmidt', '#ff7a00')] }));

    expect(element<HTMLElement>('.task-card__avatar').textContent).toContain('S');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Schmidt');
  });

  it('builds initials when the last name is missing', () => {
    renderTask(createTask({ assignees: [createAssignee('contact-1', 'Anna', '', '#ff7a00')] }));

    expect(element<HTMLElement>('.task-card__avatar').textContent).toContain('A');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Anna');
  });

  it('emits the exact supplied task when activated', () => {
    const task = createTask();
    const emitted = vi.fn();
    component.openDetail.subscribe(emitted);
    renderTask(task);

    element<HTMLButtonElement>('.task-card__open').click();

    expect(emitted).toHaveBeenCalledOnce();
    expect(emitted).toHaveBeenCalledWith(task);
  });

  it('uses a native button for Task Detail activation', () => {
    renderTask(createTask());

    const card = element<HTMLElement>('.task-card');
    const openButton = element<HTMLButtonElement>('.task-card__open');

    expect(card.tagName).toBe('ARTICLE');
    expect(openButton).toBeInstanceOf(HTMLButtonElement);
    expect(openButton.type).toBe('button');
    expect(openButton.tabIndex).toBe(0);
  });

  it('provides an accessible card name based on the task title', () => {
    renderTask(createTask({ title: 'Accessible task' }));

    expect(element<HTMLButtonElement>('.task-card__open').getAttribute('aria-label')).toBe(
      'Open task details for Accessible task.',
    );
  });

  it('keeps priority meaning independently accessible', () => {
    renderTask(createTask({ priority: 'urgent' }));

    const priority = element<HTMLImageElement>('.task-card__priority');

    expect(priority.closest('button')).toBeNull();
    expect(priority.getAttribute('alt')).toBe('Urgent priority');
  });

  it('exposes independent native progress semantics', () => {
    renderTask(
      createTask({
        subtasks: [createSubtask('First', true), createSubtask('Second', false)],
      }),
    );

    const progress = element<HTMLProgressElement>('.task-card__progress');

    expect(progress.closest('button')).toBeNull();
    expect(progress.max).toBe(100);
    expect(progress.value).toBe(50);
    expect(progress.getAttribute('aria-label')).toBe('Subtask completion: 1 of 2 completed');
  });

  function renderTask(task: TaskWithDetails): void {
    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();
  }

  function element<T extends Element>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }
});

function createTask(overrides: Partial<TaskWithDetails> = {}): TaskWithDetails {
  return {
    id: 'task-1',
    owner_id: 'user-1',
    title: 'Test task',
    description: 'Test description',
    due_date: '2026-08-30',
    priority: 'medium',
    category: 'user_story',
    status: 'todo',
    position: 0,
    created_at: '2026-08-25T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z',
    subtasks: [],
    assignees: [],
    ...overrides,
  };
}

function createSubtask(title: string, isCompleted: boolean): Subtask {
  return {
    id: `subtask-${title}`,
    task_id: 'task-1',
    title,
    is_completed: isCompleted,
    position: 0,
    created_at: '2026-08-25T00:00:00.000Z',
  };
}

function createAssignee(
  contactId: string,
  firstName: string,
  lastName: string,
  color: string,
): TaskAssigneeWithContact {
  return {
    task_id: 'task-1',
    contact_id: contactId,
    created_at: '2026-08-25T00:00:00.000Z',
    contact: {
      id: contactId,
      created_at: '2026-08-25T00:00:00.000Z',
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}@example.com`,
      phone: '+49123456789',
      color,
      updated_at: '2026-08-25T00:00:00.000Z',
    },
  };
}
