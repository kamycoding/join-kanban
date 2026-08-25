import { TestBed } from '@angular/core/testing';

import { ContactService } from './contact';
import { SupabaseService } from './supabase';

const from = vi.fn();

describe('ContactService', () => {
  let service: ContactService;
  const supabaseService = {
    client: { from },
  } as unknown as SupabaseService;

  beforeEach(() => {
    from.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: supabaseService }],
    });
    service = TestBed.inject(ContactService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('rejects invalid create and update input before starting a Supabase write', async () => {
    await expect(service.createContact('A', 'test@test.a', '12345')).resolves.toBeNull();
    await expect(service.updateContact('1', 'A', 'test@test.a', '12345')).resolves.toBeNull();

    expect(from).not.toHaveBeenCalled();
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
    from.mockReturnValue({ insert });

    const result = await service.createContact(
      '  Anna   Weber ',
      ' anna@example.de ',
      ' +49 151 1234567 ',
    );

    expect(from).toHaveBeenCalledWith('contacts');
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
