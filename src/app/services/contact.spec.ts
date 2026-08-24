import { TestBed } from '@angular/core/testing';

import { ContactService } from './contact';

const supabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabase),
}));

describe('ContactService', () => {
  let service: ContactService;

  beforeEach(() => {
    supabase.from.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('rejects invalid create and update input before starting a Supabase write', async () => {
    await expect(service.createContact('A', 'test@test.a', '12345')).resolves.toBeNull();
    await expect(service.updateContact('1', 'A', 'test@test.a', '12345')).resolves.toBeNull();

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('normalizes valid input before creating a contact', async () => {
    const createdContact = {
      id: '1',
      created_at: '2026-08-24T00:00:00.000Z',
      first_name: 'Anna',
      last_name: 'Weber',
      email: 'anna@example.de',
      phone: '+49 151 1234567',
      color: '#ff7a00',
      updated_at: '2026-08-24T00:00:00.000Z',
    };
    const single = vi.fn().mockResolvedValue({ data: createdContact, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const result = await service.createContact(
      '  Anna   Weber ',
      ' anna@example.de ',
      ' +49 151 1234567 ',
    );

    expect(supabase.from).toHaveBeenCalledWith('contacts');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Anna',
        last_name: 'Weber',
        email: 'anna@example.de',
        phone: '+49 151 1234567',
      }),
    );
    expect(result).toEqual(createdContact);
  });
});
