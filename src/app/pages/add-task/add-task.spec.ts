import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTask } from './add-task';

describe('AddTask', () => {
  let component: AddTask;
  let fixture: ComponentFixture<AddTask>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTask],
    }).compileComponents();

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
});
