import { TestBed } from '@angular/core/testing';

import { NewTask, Task, TaskWithDetails } from '../models/task';
import { SupabaseService } from './supabase';
import { TaskService } from './task';

const from = vi.fn();
const rpc = vi.fn();

describe('TaskService', () => {
  const supabaseService = {
    client: { from, rpc },
  } as unknown as SupabaseService;

  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();

    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: supabaseService }],
    });
  });

  it('loads tasks ordered by position and creation time', async () => {
    const tasks = [
      {
        ...createTask(),
        subtasks: [
          createSubtask('subtask-2', 1, '2026-08-25T00:02:00.000Z'),
          createSubtask('subtask-1', 0, '2026-08-25T00:01:00.000Z'),
        ],
        assignees: [],
      },
    ];
    const orderByCreatedAt = vi.fn().mockResolvedValue({ data: tasks, error: null });
    const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
    const select = vi.fn().mockReturnValue({ order: orderByPosition });
    from.mockReturnValue({ select });

    const service = TestBed.inject(TaskService);

    await expect(service.getTasks()).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('tasks');
    expect(select).toHaveBeenCalledWith(expect.stringContaining('subtasks (*)'));
    expect(select).toHaveBeenCalledWith(expect.stringContaining('assignees:task_assignees'));
    expect(orderByPosition).toHaveBeenCalledWith('position', { ascending: true });
    expect(orderByCreatedAt).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(service.tasks()).toEqual([
      {
        ...tasks[0],
        subtasks: [tasks[0].subtasks[1], tasks[0].subtasks[0]],
      },
    ]);
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
    expect(service.tasks()).toEqual([withEmptyDetails(createdTask)]);
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

  it('creates a task with subtasks and unique contact assignments atomically', async () => {
    const createdTask = createTask();
    rpc.mockResolvedValue({ data: createdTask, error: null });

    const service = TestBed.inject(TaskService);
    const details = {
      task: createNewTask(),
      subtasks: [{ title: 'First subtask' }, { title: 'Second subtask', is_completed: true }],
      contactIds: ['contact-1', 'contact-1', 'contact-2'],
    };

    await expect(service.createTaskWithDetails(details)).resolves.toEqual(createdTask);
    expect(rpc).toHaveBeenCalledWith('create_task_with_details', {
      p_title: 'Test task',
      p_description: 'Test description',
      p_due_date: '2026-08-30',
      p_priority: 'medium',
      p_category: 'user_story',
      p_status: 'todo',
      p_position: 0,
      p_subtasks: [
        { title: 'First subtask', position: 0 },
        { title: 'Second subtask', is_completed: true, position: 1 },
      ],
      p_contact_ids: ['contact-1', 'contact-2'],
    });
    expect(service.tasks()).toEqual([withEmptyDetails(createdTask)]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('does not add a task when atomic creation fails', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Complete task could not be created' },
    });

    const service = TestBed.inject(TaskService);

    await expect(
      service.createTaskWithDetails({ task: createNewTask(), subtasks: [{ title: 'Subtask' }] }),
    ).resolves.toBeNull();
    expect(service.tasks()).toEqual([]);
    expect(service.error()).toBe('Complete task could not be created');
    expect(service.saving()).toBe(false);
  });

  it('updates a task and replaces it in the local task list', async () => {
    const originalTask = createTask();
    const updatedTask = { ...originalTask, title: 'Updated task', priority: 'urgent' as const };
    const service = TestBed.inject(TaskService);
    await loadTasks(service, [originalTask]);

    const single = vi.fn().mockResolvedValue({ data: updatedTask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValueOnce({ update });

    const changes = { title: 'Updated task', priority: 'urgent' as const };

    await expect(service.updateTask(originalTask.id, changes)).resolves.toEqual(updatedTask);
    expect(update).toHaveBeenCalledWith(changes);
    expect(eq).toHaveBeenCalledWith('id', originalTask.id);
    expect(service.tasks()).toEqual([withEmptyDetails(updatedTask)]);
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
    const service = TestBed.inject(TaskService);
    await loadTasks(service, [task]);

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

  it('moves a task atomically and applies all normalized positions', async () => {
    const firstTask = createTask();
    const secondTask = {
      ...createTask(),
      id: 'task-2',
      position: 1,
      created_at: '2026-08-25T00:01:00.000Z',
    };
    const movedTask = {
      ...firstTask,
      status: 'in_progress' as const,
      position: 0,
    };
    const normalizedSecondTask = { ...secondTask, position: 0 };

    const service = TestBed.inject(TaskService);
    await loadTasks(service, [firstTask, secondTask]);
    rpc.mockResolvedValue({ data: [movedTask, normalizedSecondTask], error: null });

    await expect(service.moveTask('task-1', 'in_progress', 0)).resolves.toEqual(movedTask);
    expect(rpc).toHaveBeenCalledWith('move_task', {
      p_task_id: 'task-1',
      p_status: 'in_progress',
      p_position: 0,
    });
    expect(service.tasks()).toEqual([
      withEmptyDetails(movedTask),
      withEmptyDetails(normalizedSecondTask),
    ]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('keeps the task list unchanged when moving a task fails', async () => {
    const task = createTask();
    const service = TestBed.inject(TaskService);
    await loadTasks(service, [task]);
    rpc.mockResolvedValue({ data: null, error: { message: 'Task could not be moved' } });

    await expect(service.moveTask(task.id, 'done', 0)).resolves.toBeNull();
    expect(service.tasks()).toEqual([withEmptyDetails(task)]);
    expect(service.error()).toBe('Task could not be moved');
    expect(service.saving()).toBe(false);
  });

  it('rejects an invalid board position before starting a Supabase request', async () => {
    const service = TestBed.inject(TaskService);

    await expect(service.moveTask('task-1', 'done', -1)).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(service.error()).toBe('Task position must be a non-negative integer.');
  });
});

async function loadTasks(service: TaskService, tasks: Task[]): Promise<void> {
  const orderByCreatedAt = vi.fn().mockResolvedValue({ data: tasks, error: null });
  const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
  const select = vi.fn().mockReturnValue({ order: orderByPosition });
  from.mockReturnValueOnce({ select });

  await service.getTasks();
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

function withEmptyDetails(task: Task): TaskWithDetails {
  return { ...task, subtasks: [], assignees: [] };
}

function createSubtask(id: string, position: number, createdAt: string) {
  return {
    id,
    task_id: 'task-1',
    title: id,
    is_completed: false,
    position,
    created_at: createdAt,
  };
}
