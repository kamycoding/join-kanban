import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { TaskFormSubtaskValue } from '../task-form-value';
import { SubtaskInput } from './subtask-input';

describe('SubtaskInput', () => {
  let component: SubtaskInput;
  let fixture: ComponentFixture<SubtaskInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SubtaskInput] }).compileComponents();
    fixture = TestBed.createComponent(SubtaskInput);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('subtasks', []);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('adds a subtask with Enter without allowing a parent form submission', () => {
    const emitted = vi.fn();
    component.subtasksChange.subscribe(emitted);
    component.draft.set('Added with Enter');
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

    component.onDraftKeydown(event);

    expect(event.defaultPrevented).toBe(true);
    expect(emitted.mock.calls[0][0][0]).toMatchObject({
      kind: 'new',
      title: 'Added with Enter',
      isCompleted: false,
    });
    expect(component.draft()).toBe('');
  });

  it('adds with the check action and clears the input', async () => {
    const emitted = vi.fn();
    component.subtasksChange.subscribe(emitted);
    component.draft.set('Added with check');
    fixture.detectChanges();
    await fixture.whenStable();

    button('Add subtask').click();

    expect(emitted.mock.calls[0][0][0].title).toBe('Added with check');
    expect(component.draft()).toBe('');
  });

  it('discards the current add draft', async () => {
    component.draft.set('Discard me');
    fixture.detectChanges();
    await fixture.whenStable();

    button('Discard subtask').click();

    expect(component.draft()).toBe('');
    expect(component.draftError()).toBeNull();
  });

  it('renames an existing subtask with pencil and check without losing its state', async () => {
    const subtask = existingSubtask();
    const emitted = vi.fn();
    fixture.componentRef.setInput('subtasks', [subtask]);
    component.subtasksChange.subscribe(emitted);
    fixture.detectChanges();
    await fixture.whenStable();
    button('Edit subtask Existing title').click();
    component.editDraft.set('Renamed existing');
    fixture.detectChanges();
    await fixture.whenStable();

    button('Save subtask edit').click();

    expect(emitted).toHaveBeenCalledWith([
      {
        kind: 'existing',
        id: 'subtask-1',
        title: 'Renamed existing',
        isCompleted: true,
      },
    ]);
  });

  it('renames a new subtask with Enter without changing its client identity', () => {
    const subtask = newSubtask();
    const originalKey = component.subtaskKey(subtask);
    const emitted = vi.fn();
    fixture.componentRef.setInput('subtasks', [subtask]);
    component.subtasksChange.subscribe(emitted);
    component.startEditing(subtask);
    component.editDraft.set('Renamed new');

    component.onEditKeydown(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );

    const renamed = emitted.mock.calls[0][0][0] as TaskFormSubtaskValue;
    expect(renamed).toEqual({ ...subtask, title: 'Renamed new' });
    expect(component.subtaskKey(renamed)).toBe(originalKey);
  });

  it.each(['   ', 'a'.repeat(101)])('rejects the invalid edited title %j', (title) => {
    const subtask = existingSubtask();
    const emitted = vi.fn();
    fixture.componentRef.setInput('subtasks', [subtask]);
    component.subtasksChange.subscribe(emitted);
    component.startEditing(subtask);
    component.editDraft.set(title);

    component.confirmEditing();

    expect(emitted).not.toHaveBeenCalled();
    expect(component.editError()).toBeTruthy();
    expect(component.editingKey()).toBe(component.subtaskKey(subtask));
  });

  it('cancels editing with Escape', () => {
    const subtask = existingSubtask();
    fixture.componentRef.setInput('subtasks', [subtask]);
    component.startEditing(subtask);
    component.editDraft.set('Unsaved title');
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });

    component.onEditKeydown(event);

    expect(event.defaultPrevented).toBe(true);
    expect(component.editingKey()).toBeNull();
  });

  it('keeps the Escape consumed for inline editing from reaching a parent handler', async () => {
    const subtask = existingSubtask();
    fixture.componentRef.setInput('subtasks', [subtask]);
    fixture.detectChanges();
    await fixture.whenStable();
    button('Edit subtask Existing title').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const parentListener = vi.fn();
    fixture.nativeElement.addEventListener('keydown', parentListener);
    const editInput = fixture.nativeElement.querySelector(
      'input[aria-label="Edit subtask Existing title"]',
    ) as HTMLInputElement;
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    editInput.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(parentListener).not.toHaveBeenCalled();
    expect(component.editingKey()).toBeNull();
  });

  it('deletes a subtask by stable identity', () => {
    const first = existingSubtask();
    const second = newSubtask();
    const emitted = vi.fn();
    fixture.componentRef.setInput('subtasks', [first, second]);
    component.subtasksChange.subscribe(emitted);

    component.removeSubtask(first);

    expect(emitted).toHaveBeenCalledWith([second]);
  });

  it('prevents add, edit, rename, and delete while disabled', () => {
    const subtask = existingSubtask();
    const emitted = vi.fn();
    fixture.componentRef.setInput('subtasks', [subtask]);
    fixture.componentRef.setInput('disabled', true);
    component.subtasksChange.subscribe(emitted);
    component.draft.set('Blocked add');

    component.addSubtask();
    component.startEditing(subtask);
    component.confirmEditing();
    component.removeSubtask(subtask);

    expect(emitted).not.toHaveBeenCalled();
    expect(component.editingKey()).toBeNull();
  });

  function button(label: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
  }
});

function existingSubtask(): TaskFormSubtaskValue {
  return {
    kind: 'existing',
    id: 'subtask-1',
    title: 'Existing title',
    isCompleted: true,
  };
}

function newSubtask(): TaskFormSubtaskValue {
  return {
    kind: 'new',
    clientId: 'new-subtask-fixed',
    title: 'New title',
    isCompleted: false,
  };
}
