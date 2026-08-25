import { TestBed } from '@angular/core/testing';

import { Task } from '../models/task';
import { SupabaseService } from './supabase';
import { TaskService } from './task';

describe('TaskService', () => {
  const from = vi.fn();
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
});

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
