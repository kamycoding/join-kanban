import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { TaskWithDetails } from '../../../models/task';
import { TaskDetail } from './task-detail';
import { createTask } from './task-detail-test-helpers';

describe('TaskDetail accessibility', () => {
  let component: TaskDetail;
  let fixture: ComponentFixture<TaskDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskDetail] }).compileComponents();
    fixture = TestBed.createComponent(TaskDetail);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('requests close when Escape is pressed', () => {
    const emitted = vi.fn();
    component.closeRequested.subscribe(emitted);
    renderTask(createTask());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(emitted).toHaveBeenCalledOnce();
  });

  it('requests close when the backdrop itself is clicked', () => {
    const emitted = vi.fn();
    component.closeRequested.subscribe(emitted);
    renderTask(createTask());
    element<HTMLElement>('.task-detail-backdrop').click();
    expect(emitted).toHaveBeenCalledOnce();
  });

  it('does not request close for a click inside the dialog', () => {
    const emitted = vi.fn();
    component.closeRequested.subscribe(emitted);
    renderTask(createTask());
    element<HTMLElement>('.task-detail__title').click();
    expect(emitted).not.toHaveBeenCalled();
  });

  it('exposes modal dialog semantics linked to the title', () => {
    renderTask(createTask());
    const dialog = element<HTMLElement>('.task-detail');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(component.titleId);
    expect(element<HTMLElement>(`#${component.titleId}`)).toBeTruthy();
  });

  it('uses unique matching accessibility IDs for two TaskDetail instances', () => {
    renderTask(createTask());
    const secondFixture = TestBed.createComponent(TaskDetail);
    const container = document.createElement('div');
    container.append(fixture.nativeElement, secondFixture.nativeElement);
    secondFixture.componentRef.setInput('task', createTask({ id: 'task-2' }));
    secondFixture.detectChanges();
    try {
      const firstDialog = element<HTMLElement>('.task-detail');
      const secondDialog = secondFixture.nativeElement.querySelector('.task-detail') as HTMLElement;
      const firstTitle = element<HTMLElement>('.task-detail__title');
      const secondTitle = secondFixture.nativeElement.querySelector(
        '.task-detail__title',
      ) as HTMLElement;
      const firstSections = Array.from(
        fixture.nativeElement.querySelectorAll('.task-detail__section') as NodeListOf<HTMLElement>,
      );
      const secondSections = Array.from(
        secondFixture.nativeElement.querySelectorAll(
          '.task-detail__section',
        ) as NodeListOf<HTMLElement>,
      );
      const referencedIds = [
        firstTitle.id,
        secondTitle.id,
        ...firstSections.map((section) => section.querySelector('h3')?.id ?? ''),
        ...secondSections.map((section) => section.querySelector('h3')?.id ?? ''),
      ];
      expect(firstTitle.id).not.toBe(secondTitle.id);
      expect(firstDialog.getAttribute('aria-labelledby')).toBe(firstTitle.id);
      expect(secondDialog.getAttribute('aria-labelledby')).toBe(secondTitle.id);
      expect(new Set(referencedIds).size).toBe(referencedIds.length);
      for (const section of [...firstSections, ...secondSections]) {
        expect(section.getAttribute('aria-labelledby')).toBe(section.querySelector('h3')?.id);
      }
    } finally {
      secondFixture.destroy();
      container.remove();
    }
  });

  it('provides an accessible native close control', () => {
    renderTask(createTask());
    const close = element<HTMLButtonElement>('.task-detail__close');
    expect(close.tagName).toBe('BUTTON');
    expect(close.type).toBe('button');
    expect(close.getAttribute('aria-label')).toBe('Close task details');
  });

  it('moves initial focus to the close button', async () => {
    renderTask(createTask());
    await fixture.whenStable();
    expect(document.activeElement).toBe(element<HTMLButtonElement>('.task-detail__close'));
  });

  it('wraps forward Tab focus from the last control to the close button', () => {
    renderTask(createTask());
    actionButton('Edit').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(element<HTMLButtonElement>('.task-detail__close'));
  });

  it('wraps Shift+Tab focus from the close button to the last control', () => {
    renderTask(createTask());
    element<HTMLButtonElement>('.task-detail__close').focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(actionButton('Edit'));
  });

  it('skips disabled controls when wrapping focus', () => {
    renderTask(createTask());
    actionButton('Edit').disabled = true;
    element<HTMLButtonElement>('.task-detail__close').focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(actionButton('Delete'));
  });

  it('redirects focus that moves outside the modal', () => {
    renderTask(createTask());
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    expect(document.activeElement).toBe(element<HTMLButtonElement>('.task-detail__close'));
    outside.remove();
  });

  it('removes global keyboard and focus handling when destroyed', () => {
    renderTask(createTask());
    const outside = document.createElement('button');
    document.body.append(outside);
    fixture.destroy();
    outside.focus();
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);
    expect(document.activeElement).toBe(outside);
    expect(escapeEvent.defaultPrevented).toBe(false);
    outside.remove();
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
