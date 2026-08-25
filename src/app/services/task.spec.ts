import { TestBed } from '@angular/core/testing';

import { NewSubtask, NewTask, Subtask, Task } from '../models/task';
import { SupabaseService } from './supabase';
import { TaskService } from './task';

const from = vi.fn();

describe('TaskService', () => {
  const supabaseService = {
    client: { from },
  } as unknown as SupabaseService;

  beforeEach(() => {
    from.mockReset();

    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: supabaseService }],
    });
  });

  it('loads tasks ordered by position and creation time', async () => {
    const tasks = [createTask()];
    const orderByCreatedAt = vi.fn().mockResolvedValue({ data: tasks, error: null });
    const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
    const select = vi.fn().mockReturnValue({ order: orderByPosition });
    from.mockReturnValue({ select });

    const service = TestBed.inject(TaskService);

    await expect(service.getTasks()).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('tasks');
    expect(select).toHaveBeenCalledWith('*');
    expect(orderByPosition).toHaveBeenCalledWith('position', { ascending: true });
    expect(orderByCreatedAt).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(service.tasks()).toEqual(tasks);
    expect(service.error()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('exposes a load error without replacing the current tasks', async () => {
    const orderByCreatedAt = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Tasks could not be loaded' },
    });
    const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
    const select = vi.fn().mockReturnValue({ order: orderByPosition });
    from.mockReturnValue({ select });

    const service = TestBed.inject(TaskService);

    await expect(service.getTasks()).resolves.toBe(false);
    expect(service.tasks()).toEqual([]);
    expect(service.error()).toBe('Tasks could not be loaded');
    expect(service.loading()).toBe(false);
  });

  it('creates a task and adds it to the local task list', async () => {
    const newTask = createNewTask();
    const createdTask = createTask();
    const single = vi.fn().mockResolvedValue({ data: createdTask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(TaskService);

    await expect(service.createTask(newTask)).resolves.toEqual(createdTask);
    expect(from).toHaveBeenCalledWith('tasks');
    expect(insert).toHaveBeenCalledWith(newTask);
    expect(select).toHaveBeenCalledWith('*');
    expect(single).toHaveBeenCalledOnce();
    expect(service.tasks()).toEqual([createdTask]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('exposes a create error without adding a task', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Task could not be created' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(TaskService);

    await expect(service.createTask(createNewTask())).resolves.toBeNull();
    expect(service.tasks()).toEqual([]);
    expect(service.error()).toBe('Task could not be created');
    expect(service.saving()).toBe(false);
  });

  it('updates a task and replaces it in the local task list', async () => {
    const originalTask = createTask();
    const updatedTask = { ...originalTask, title: 'Updated task', priority: 'urgent' as const };

    const loadOrderByCreatedAt = vi.fn().mockResolvedValue({
      data: [originalTask],
      error: null,
    });
    const loadOrderByPosition = vi.fn().mockReturnValue({ order: loadOrderByCreatedAt });
    const loadSelect = vi.fn().mockReturnValue({ order: loadOrderByPosition });
    from.mockReturnValueOnce({ select: loadSelect });

    const service = TestBed.inject(TaskService);
    await service.getTasks();

    const single = vi.fn().mockResolvedValue({ data: updatedTask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValueOnce({ update });

    const changes = { title: 'Updated task', priority: 'urgent' as const };

    await expect(service.updateTask(originalTask.id, changes)).resolves.toEqual(updatedTask);
    expect(update).toHaveBeenCalledWith(changes);
    expect(eq).toHaveBeenCalledWith('id', originalTask.id);
    expect(select).toHaveBeenCalledWith('*');
    expect(service.tasks()).toEqual([updatedTask]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('exposes an update error without replacing the task', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Task could not be updated' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ update });

    const service = TestBed.inject(TaskService);

    await expect(service.updateTask('task-1', { status: 'done' })).resolves.toBeNull();
    expect(service.tasks()).toEqual([]);
    expect(service.error()).toBe('Task could not be updated');
    expect(service.saving()).toBe(false);
  });

  it('deletes a task and removes it from the local task list', async () => {
    const task = createTask();
    const loadOrderByCreatedAt = vi.fn().mockResolvedValue({ data: [task], error: null });
    const loadOrderByPosition = vi.fn().mockReturnValue({ order: loadOrderByCreatedAt });
    const loadSelect = vi.fn().mockReturnValue({ order: loadOrderByPosition });
    from.mockReturnValueOnce({ select: loadSelect });

    const service = TestBed.inject(TaskService);
    await service.getTasks();

    const single = vi.fn().mockResolvedValue({ data: { id: task.id }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const deleteTask = vi.fn().mockReturnValue({ eq });
    from.mockReturnValueOnce({ delete: deleteTask });

    await expect(service.deleteTask(task.id)).resolves.toBe(true);
    expect(deleteTask).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith('id', task.id);
    expect(select).toHaveBeenCalledWith('id');
    expect(service.tasks()).toEqual([]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('exposes a delete error without removing the task', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Task could not be deleted' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const deleteTask = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ delete: deleteTask });

    const service = TestBed.inject(TaskService);

    await expect(service.deleteTask('task-1')).resolves.toBe(false);
    expect(service.tasks()).toEqual([]);
    expect(service.error()).toBe('Task could not be deleted');
    expect(service.saving()).toBe(false);
  });

  it('updates status and position when moving a task', async () => {
    const movedTask = {
      ...createTask(),
      status: 'in_progress' as const,
      position: 2,
    };
    const single = vi.fn().mockResolvedValue({ data: movedTask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ update });

    const service = TestBed.inject(TaskService);

    await expect(service.moveTask('task-1', 'in_progress', 2)).resolves.toEqual(movedTask);
    expect(update).toHaveBeenCalledWith({ status: 'in_progress', position: 2 });
    expect(eq).toHaveBeenCalledWith('id', 'task-1');
    expect(service.error()).toBeNull();
  });

  it('rejects an invalid board position before starting a Supabase request', async () => {
    const service = TestBed.inject(TaskService);

    await expect(service.moveTask('task-1', 'done', -1)).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(service.error()).toBe('Task position must be a non-negative integer.');
  });

  it('loads the subtasks of one task in their display order', async () => {
    const subtasks = [createSubtask()];
    const orderByCreatedAt = vi.fn().mockResolvedValue({ data: subtasks, error: null });
    const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
    const eq = vi.fn().mockReturnValue({ order: orderByPosition });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    const service = TestBed.inject(TaskService);

    await expect(service.getSubtasks('task-1')).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('subtasks');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('task_id', 'task-1');
    expect(orderByPosition).toHaveBeenCalledWith('position', { ascending: true });
    expect(orderByCreatedAt).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(service.subtasks()).toEqual(subtasks);
    expect(service.loadingSubtasks()).toBe(false);
  });

  it('creates a subtask at the next available position', async () => {
    const newSubtask: NewSubtask = { task_id: 'task-1', title: 'New subtask' };
    const createdSubtask = createSubtask();
    const single = vi.fn().mockResolvedValue({ data: createdSubtask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(TaskService);

    await expect(service.createSubtask(newSubtask)).resolves.toEqual(createdSubtask);
    expect(insert).toHaveBeenCalledWith({ ...newSubtask, position: 0 });
    expect(select).toHaveBeenCalledWith('*');
    expect(service.subtasks()).toEqual([createdSubtask]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('exposes a subtask creation error without changing the subtask list', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Subtask could not be created' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(TaskService);

    await expect(
      service.createSubtask({ task_id: 'task-1', title: 'New subtask' }),
    ).resolves.toBeNull();
    expect(service.subtasks()).toEqual([]);
    expect(service.error()).toBe('Subtask could not be created');
  });

  it('updates a subtask title, completion state and position', async () => {
    const originalSubtask = createSubtask();
    const updatedSubtask = {
      ...originalSubtask,
      title: 'Updated subtask',
      is_completed: true,
      position: 2,
    };
    const service = TestBed.inject(TaskService);
    await loadSubtasks(service, [originalSubtask]);

    const single = vi.fn().mockResolvedValue({ data: updatedSubtask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValueOnce({ update });

    const changes = {
      title: 'Updated subtask',
      is_completed: true,
      position: 2,
    };

    await expect(service.updateSubtask(originalSubtask.id, changes)).resolves.toEqual(
      updatedSubtask,
    );
    expect(update).toHaveBeenCalledWith(changes);
    expect(eq).toHaveBeenCalledWith('id', originalSubtask.id);
    expect(service.subtasks()).toEqual([updatedSubtask]);
    expect(service.error()).toBeNull();
  });

  it('sets the completion state through the dedicated method', async () => {
    const completedSubtask = { ...createSubtask(), is_completed: true };
    const single = vi.fn().mockResolvedValue({ data: completedSubtask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ update });

    const service = TestBed.inject(TaskService);

    await expect(service.setSubtaskCompleted('subtask-1', true)).resolves.toEqual(completedSubtask);
    expect(update).toHaveBeenCalledWith({ is_completed: true });
  });

  it('rejects an invalid subtask position before starting a Supabase request', async () => {
    const service = TestBed.inject(TaskService);

    await expect(service.updateSubtask('subtask-1', { position: -1 })).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(service.error()).toBe('Subtask position must be a non-negative integer.');
  });

  it('deletes a subtask and removes it from the local subtask list', async () => {
    const subtask = createSubtask();
    const service = TestBed.inject(TaskService);
    await loadSubtasks(service, [subtask]);

    const single = vi.fn().mockResolvedValue({ data: { id: subtask.id }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const deleteSubtask = vi.fn().mockReturnValue({ eq });
    from.mockReturnValueOnce({ delete: deleteSubtask });

    await expect(service.deleteSubtask(subtask.id)).resolves.toBe(true);
    expect(deleteSubtask).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith('id', subtask.id);
    expect(select).toHaveBeenCalledWith('id');
    expect(service.subtasks()).toEqual([]);
  });

  it('keeps the subtask when deleting it fails', async () => {
    const subtask = createSubtask();
    const service = TestBed.inject(TaskService);
    await loadSubtasks(service, [subtask]);

    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Subtask could not be deleted' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const deleteSubtask = vi.fn().mockReturnValue({ eq });
    from.mockReturnValueOnce({ delete: deleteSubtask });

    await expect(service.deleteSubtask(subtask.id)).resolves.toBe(false);
    expect(service.subtasks()).toEqual([subtask]);
    expect(service.error()).toBe('Subtask could not be deleted');
  });
});

async function loadSubtasks(service: TaskService, subtasks: Subtask[]): Promise<void> {
  const orderByCreatedAt = vi.fn().mockResolvedValue({ data: subtasks, error: null });
  const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
  const eq = vi.fn().mockReturnValue({ order: orderByPosition });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValueOnce({ select });

  await service.getSubtasks('task-1');
}

function createNewTask(): NewTask {
  return {
    title: 'Test task',
    description: 'Test description',
    due_date: '2026-08-30',
    priority: 'medium',
    category: 'user_story',
    status: 'todo',
    position: 0,
  };
}

function createTask(): Task {
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
  };
}

function createSubtask(): Subtask {
  return {
    id: 'subtask-1',
    task_id: 'task-1',
    title: 'New subtask',
    is_completed: false,
    position: 0,
    created_at: '2026-08-25T00:00:00.000Z',
  };
}
