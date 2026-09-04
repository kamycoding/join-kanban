import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type {
  Subtask,
  TaskMoveRequest,
  TaskMoveTarget,
  TaskWithDetails,
} from '../../../models/task';
import type { TaskAssigneeWithContact } from '../../../models/task-assignee';
import { TaskCard } from './task-card';

const MOVE_TARGETS: TaskMoveTarget[] = [
  { status: 'todo', label: 'To do', direction: 'up' },
  { status: 'await_feedback', label: 'Await feedback', direction: 'down' },
];

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

  it('builds initials from normal first and last names', () => {
    renderTask(
      createTask({
        assignees: [createAssignee('contact-1', 'Anna', 'Schmidt', '#ff7a00')],
      }),
    );

    const avatar = element<HTMLElement>('.task-card__avatar');

    expect(visibleInitials()).toBe('AS');
    expect(avatar.style.backgroundColor).toBe('rgb(255, 122, 0)');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Anna Schmidt');
  });

  it('trims surrounding whitespace before building initials', () => {
    renderTask(
      createTask({
        assignees: [createAssignee('contact-1', '  Anna  ', '  Schmidt  ', '#ff7a00')],
      }),
    );

    expect(visibleInitials()).toBe('AS');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Anna Schmidt');
  });

  it('keeps a non-BMP Unicode code point intact when building initials', () => {
    renderTask(
      createTask({
        assignees: [createAssignee('contact-1', '😀lex', 'Schmidt', '#ff7a00')],
      }),
    );

    expect(visibleInitials()).toBe('😀S');
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

  it('shows six assignees and the number of remaining contacts', () => {
    const assignees = Array.from({ length: 10 }, (_, index) =>
      createAssignee(`contact-${index}`, `First${index}`, `Last${index}`, '#462f8a'),
    );
    renderTask(createTask({ assignees }));

    expect(fixture.nativeElement.querySelectorAll('.task-card__avatar-name')).toHaveLength(6);
    expect(element<HTMLElement>('.task-card__avatar--remaining').textContent?.trim()).toBe('+4');
    expect(element<HTMLElement>('.task-card__avatar--remaining').getAttribute('aria-label')).toBe(
      '4 more assigned contacts',
    );
  });

  it('does not show a remaining-contact counter for exactly six assignees', () => {
    const assignees = Array.from({ length: 6 }, (_, index) =>
      createAssignee(`contact-${index}`, `First${index}`, `Last${index}`, '#462f8a'),
    );
    renderTask(createTask({ assignees }));

    expect(fixture.nativeElement.querySelectorAll('.task-card__avatar')).toHaveLength(6);
    expect(fixture.nativeElement.querySelector('.task-card__avatar--remaining')).toBeNull();
  });

  it('builds initials when the first name is missing', () => {
    renderTask(createTask({ assignees: [createAssignee('contact-1', '', 'Schmidt', '#ff7a00')] }));

    expect(visibleInitials()).toBe('S');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Schmidt');
  });

  it('builds initials when the last name is missing', () => {
    renderTask(createTask({ assignees: [createAssignee('contact-1', 'Anna', '', '#ff7a00')] }));

    expect(visibleInitials()).toBe('A');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Anna');
  });

  it('keeps the empty initials and unnamed-contact fallback for empty names', () => {
    renderTask(createTask({ assignees: [createAssignee('contact-1', ' ', ' ', '#ff7a00')] }));

    expect(visibleInitials()).toBe('');
    expect(element<HTMLElement>('.task-card__avatar-name').textContent).toBe('Unnamed contact');
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

  it('hides the move button when the card has nowhere to go', () => {
    renderTask(createTask());

    expect(element('.task-card__move-button')).toBeNull();
  });

  it('opens the move menu and lists the targets it was handed', () => {
    renderTask(createTask(), MOVE_TARGETS);

    element<HTMLButtonElement>('.task-card__move-button').click();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.task-card__menu-item');

    expect(component.menuOpen()).toBe(true);
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('To do');
    expect(items[1].textContent).toContain('Await feedback');
    expect(element('.task-card__menu-title').textContent).toContain('Move to');
  });

  it('reports the chosen column and closes the menu', () => {
    const task = createTask();
    const moves: TaskMoveRequest[] = [];
    renderTask(task, MOVE_TARGETS);
    component.moveRequested.subscribe((request) => moves.push(request));

    element<HTMLButtonElement>('.task-card__move-button').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelectorAll('.task-card__menu-item')[1].click();
    fixture.detectChanges();

    expect(moves).toEqual([{ task, status: 'await_feedback' }]);
    expect(component.menuOpen()).toBe(false);
    expect(element('.task-card__menu')).toBeNull();
  });

  it('keeps the menu above the click surface that covers the whole card', () => {
    renderTask(createTask(), MOVE_TARGETS);

    element<HTMLButtonElement>('.task-card__move-button').click();
    fixture.detectChanges();

    const menu = element<HTMLElement>('.task-card__menu');
    const menuLayer = Number(getComputedStyle(menu).zIndex);

    expect(menuLayer).toBeGreaterThan(2);
  });

  it('closes the menu on a click somewhere else', () => {
    renderTask(createTask(), MOVE_TARGETS);

    element<HTMLButtonElement>('.task-card__move-button').click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();

    expect(component.menuOpen()).toBe(false);
  });

  function renderTask(task: TaskWithDetails, moveTargets: TaskMoveTarget[] = []): void {
    fixture.componentRef.setInput('task', task);
    fixture.componentRef.setInput('moveTargets', moveTargets);
    fixture.detectChanges();
  }

  function element<T extends Element>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  function visibleInitials(): string {
    return (
      element<HTMLElement>('.task-card__avatar [aria-hidden="true"]').textContent?.trim() ?? ''
    );
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
