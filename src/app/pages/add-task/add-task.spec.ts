import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';
import { AddTask } from './add-task';

describe('AddTask', () => {
  let component: AddTask;
  let fixture: ComponentFixture<AddTask>;
  let taskService: {
    saving: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    createTaskWithDetails: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    taskService = {
      saving: signal(false),
      error: signal<string | null>(null),
      createTaskWithDetails: vi.fn().mockResolvedValue({ id: 'task-1' }),
    };

    await TestBed.configureTestingModule({
      imports: [AddTask],
    })
      .overrideProvider(TaskService, { useValue: taskService })
      .overrideProvider(ContactService, {
        useValue: { contacts: signal([]), getContacts: vi.fn().mockResolvedValue(true) },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddTask);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should count title characters and show an error above 100 characters', async () => {
    component.formModel.update((value) => ({ ...value, title: 'a'.repeat(101) }));
    component.taskForm.title().markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    const message = fixture.nativeElement.querySelector('.task-form__message');
    const counter = fixture.nativeElement.querySelector('.task-form__counter');

    expect(component.taskForm.title().invalid()).toBe(true);
    expect(message.textContent).toContain('Title must have 100 characters or fewer.');
    expect(counter.textContent.trim()).toBe('101/100');
    expect(counter.classList).toContain('task-form__counter--invalid');
  });

  it('creates the task in the column it was handed', async () => {
    fixture.componentRef.setInput('status', 'await_feedback');
    await fillRequiredFields();

    await component.onSubmit(new Event('submit'));

    expect(taskService.createTaskWithDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.objectContaining({ status: 'await_feedback', title: 'Write the docs' }),
      }),
    );
  });

  it('defaults to the To-do column as a routed page', async () => {
    await fillRequiredFields();

    await component.onSubmit(new Event('submit'));

    expect(taskService.createTaskWithDetails).toHaveBeenCalledWith(
      expect.objectContaining({ task: expect.objectContaining({ status: 'todo' }) }),
    );
  });

  it('confirms in place on the page and reports upwards in the overlay', async () => {
    const saves: unknown[] = [];
    component.saved.subscribe((task) => saves.push(task));
    await fillRequiredFields();

    await component.onSubmit(new Event('submit'));

    expect(component.successToast()).toBe(true);
    expect(saves).toEqual([]);

    fixture.componentRef.setInput('inOverlay', true);
    await fillRequiredFields();
    await component.onSubmit(new Event('submit'));

    expect(saves).toEqual([{ id: 'task-1' }]);
  });

  it('reads Cancel instead of Clear inside the overlay', async () => {
    const label = () =>
      fixture.nativeElement.querySelector('.task-form__actions app-button').textContent.trim();

    expect(label()).toBe('Clear');

    fixture.componentRef.setInput('inOverlay', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(label()).toBe('Cancel');
  });

  it('empties the form and reports back when cancelled', async () => {
    let cancelled = 0;
    component.cancelled.subscribe(() => (cancelled += 1));
    fixture.componentRef.setInput('inOverlay', true);
    await fillRequiredFields();

    component.cancelForm();

    expect(cancelled).toBe(1);
    expect(component.formModel().title).toBe('');
    expect(taskService.createTaskWithDetails).not.toHaveBeenCalled();
  });

  async function fillRequiredFields(): Promise<void> {
    component.formModel.update((value) => ({
      ...value,
      title: 'Write the docs',
      dueDate: component.today,
      category: 'user_story',
    }));
    fixture.detectChanges();
    await fixture.whenStable();
  }
});
