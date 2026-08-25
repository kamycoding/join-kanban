import { TestBed } from '@angular/core/testing';

import { Contact } from '../models/contact';
import { TaskAssigneeWithContact } from '../models/task-assignee';
import { SupabaseService } from './supabase';
import { TaskAssigneeService } from './task-assignee';

const from = vi.fn();

describe('TaskAssigneeService', () => {
  const supabaseService = {
    client: { from },
  } as unknown as SupabaseService;

  beforeEach(() => {
    from.mockReset();

    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: supabaseService }],
    });
  });

  it('loads assignees with their contact data', async () => {
    const assignments = [createAssignment()];
    const order = vi.fn().mockResolvedValue({ data: assignments, error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    const service = TestBed.inject(TaskAssigneeService);

    await expect(service.getAssignees('task-1')).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('task_assignees');
    expect(select).toHaveBeenCalledWith(expect.stringContaining('contact:contacts'));
    expect(eq).toHaveBeenCalledWith('task_id', 'task-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(service.assignees()).toEqual(assignments);
    expect(service.error()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('exposes a load error without changing the assignee list', async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Assignees could not be loaded' },
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    const service = TestBed.inject(TaskAssigneeService);

    await expect(service.getAssignees('task-1')).resolves.toBe(false);
    expect(service.assignees()).toEqual([]);
    expect(service.error()).toBe('Assignees could not be loaded');
  });

  it('assigns a contact and adds the result to the local list', async () => {
    const assignment = createAssignment();
    const single = vi.fn().mockResolvedValue({ data: assignment, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(TaskAssigneeService);

    await expect(service.assignContact('task-1', 'contact-1')).resolves.toEqual(assignment);
    expect(insert).toHaveBeenCalledWith({ task_id: 'task-1', contact_id: 'contact-1' });
    expect(select).toHaveBeenCalledWith(expect.stringContaining('contact:contacts'));
    expect(service.assignees()).toEqual([assignment]);
    expect(service.error()).toBeNull();
    expect(service.saving()).toBe(false);
  });

  it('exposes an assignment error without changing the local list', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Contact could not be assigned' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(TaskAssigneeService);

    await expect(service.assignContact('task-1', 'contact-1')).resolves.toBeNull();
    expect(service.assignees()).toEqual([]);
    expect(service.error()).toBe('Contact could not be assigned');
  });

  it('removes a contact assignment from Supabase and the local list', async () => {
    const assignment = createAssignment();
    const service = TestBed.inject(TaskAssigneeService);
    await loadAssignments(service, [assignment]);

    const single = vi.fn().mockResolvedValue({
      data: { task_id: 'task-1', contact_id: 'contact-1' },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const contactEq = vi.fn().mockReturnValue({ select });
    const taskEq = vi.fn().mockReturnValue({ eq: contactEq });
    const deleteAssignment = vi.fn().mockReturnValue({ eq: taskEq });
    from.mockReturnValueOnce({ delete: deleteAssignment });

    await expect(service.removeContact('task-1', 'contact-1')).resolves.toBe(true);
    expect(taskEq).toHaveBeenCalledWith('task_id', 'task-1');
    expect(contactEq).toHaveBeenCalledWith('contact_id', 'contact-1');
    expect(select).toHaveBeenCalledWith('task_id, contact_id');
    expect(service.assignees()).toEqual([]);
  });

  it('keeps the assignment when removing it fails', async () => {
    const assignment = createAssignment();
    const service = TestBed.inject(TaskAssigneeService);
    await loadAssignments(service, [assignment]);

    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Contact assignment could not be removed' },
    });
    const select = vi.fn().mockReturnValue({ single });
    const contactEq = vi.fn().mockReturnValue({ select });
    const taskEq = vi.fn().mockReturnValue({ eq: contactEq });
    const deleteAssignment = vi.fn().mockReturnValue({ eq: taskEq });
    from.mockReturnValueOnce({ delete: deleteAssignment });

    await expect(service.removeContact('task-1', 'contact-1')).resolves.toBe(false);
    expect(service.assignees()).toEqual([assignment]);
    expect(service.error()).toBe('Contact assignment could not be removed');
  });
});

async function loadAssignments(
  service: TaskAssigneeService,
  assignments: TaskAssigneeWithContact[],
): Promise<void> {
  const order = vi.fn().mockResolvedValue({ data: assignments, error: null });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValueOnce({ select });

  await service.getAssignees('task-1');
}

function createAssignment(): TaskAssigneeWithContact {
  return {
    task_id: 'task-1',
    contact_id: 'contact-1',
    created_at: '2026-08-25T00:00:00.000Z',
    contact: createContact(),
  };
}

function createContact(): Contact {
  return {
    id: 'contact-1',
    created_at: '2026-08-25T00:00:00.000Z',
    first_name: 'Anna',
    last_name: 'Weber',
    email: 'anna@example.de',
    phone: '+49 151 1234567',
    color: '#ff7a00',
    updated_at: '2026-08-25T00:00:00.000Z',
  };
}
