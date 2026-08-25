import { TestBed } from '@angular/core/testing';

import { NewSubtask, Subtask } from '../models/task';
import { SubtaskService } from './subtask';
import { SupabaseService } from './supabase';

const from = vi.fn();

describe('SubtaskService', () => {
  const supabaseService = {
    client: { from },
  } as unknown as SupabaseService;

  beforeEach(() => {
    from.mockReset();

    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: supabaseService }],
    });
  });

  it('loads the subtasks of one task in their display order', async () => {
    const subtasks = [createSubtask()];
    const orderByCreatedAt = vi.fn().mockResolvedValue({ data: subtasks, error: null });
    const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
    const eq = vi.fn().mockReturnValue({ order: orderByPosition });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    const service = TestBed.inject(SubtaskService);

    await expect(service.getSubtasks('task-1')).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('subtasks');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('task_id', 'task-1');
    expect(orderByPosition).toHaveBeenCalledWith('position', { ascending: true });
    expect(orderByCreatedAt).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(service.subtasks()).toEqual(subtasks);
    expect(service.loading()).toBe(false);
  });

  it('creates a subtask at the next available position', async () => {
    const newSubtask: NewSubtask = { task_id: 'task-1', title: 'New subtask' };
    const createdSubtask = createSubtask();
    const single = vi.fn().mockResolvedValue({ data: createdSubtask, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(SubtaskService);

    await expect(service.createSubtask(newSubtask)).resolves.toEqual(createdSubtask);
    expect(insert).toHaveBeenCalledWith({ ...newSubtask, position: 0 });
    expect(select).toHaveBeenCalledWith('*');
    expect(service.subtasks()).toEqual([createdSubtask]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('exposes a create error without changing the subtask list', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Subtask could not be created' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(SubtaskService);

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
    const service = TestBed.inject(SubtaskService);
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

    const service = TestBed.inject(SubtaskService);

    await expect(service.setSubtaskCompleted('subtask-1', true)).resolves.toEqual(completedSubtask);
    expect(update).toHaveBeenCalledWith({ is_completed: true });
  });

  it('rejects an invalid position before starting a Supabase request', async () => {
    const service = TestBed.inject(SubtaskService);

    await expect(service.updateSubtask('subtask-1', { position: -1 })).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(service.error()).toBe('Subtask position must be a non-negative integer.');
  });

  it('deletes a subtask and removes it from the local list', async () => {
    const subtask = createSubtask();
    const service = TestBed.inject(SubtaskService);
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
    const service = TestBed.inject(SubtaskService);
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

async function loadSubtasks(service: SubtaskService, subtasks: Subtask[]): Promise<void> {
  const orderByCreatedAt = vi.fn().mockResolvedValue({ data: subtasks, error: null });
  const orderByPosition = vi.fn().mockReturnValue({ order: orderByCreatedAt });
  const eq = vi.fn().mockReturnValue({ order: orderByPosition });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValueOnce({ select });

  await service.getSubtasks('task-1');
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
