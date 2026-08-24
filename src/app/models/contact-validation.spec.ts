import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_PHONE_MAX_LENGTH,
  normalizeContactInput,
  splitContactName,
  validateContactEmail,
  validateContactInput,
  validateContactName,
  validateContactPhone,
} from './contact-validation';

describe('Contact validation', () => {
  describe('name', () => {
    it.each(['', '   ', 'A', ' A '])('rejects %j', (name) => {
      expect(validateContactName(name)).not.toBeNull();
    });

    it.each(['Jo', 'Li', 'Anna Weber', 'Jean Luc Picard', "Anne-Marie O'Connor", 'M\u00fcller'])(
      'accepts %j',
      (name) => {
        expect(validateContactName(name)).toBeNull();
      },
    );

    it('accepts the maximum length and rejects values above it', () => {
      expect(validateContactName('A'.repeat(CONTACT_NAME_MAX_LENGTH))).toBeNull();
      expect(validateContactName('A'.repeat(CONTACT_NAME_MAX_LENGTH + 1))?.kind).toBe('maxLength');
    });
  });

  describe('email', () => {
    it.each([
      '',
      '   ',
      'test',
      'test@',
      'test@test',
      'test@test.',
      'test@test.a',
      '@test.de',
      'test@@test.de',
      'test @test.de',
      'test@test .de',
      '.test@test.de',
      'test.@test.de',
      'test..name@test.de',
      'test<>@example.de',
      'test,@example.de',
      'test;@example.de',
    ])('rejects %j', (email) => {
      expect(validateContactEmail(email)).not.toBeNull();
    });

    it.each([
      'test@test.de',
      'test@test.com',
      'test@example.de',
      'anna.weber@example.de',
      'user_name@example.de',
      'user-name@example.de',
      'user+tag@example.com',
      'first.last+tag@sub.example.co.uk',
      'user+tag@sub.example.co.uk',
    ])('accepts %j', (email) => {
      expect(validateContactEmail(email)).toBeNull();
    });

    it('accepts a 64 character local part and rejects a 65 character local part', () => {
      expect(validateContactEmail(`${'a'.repeat(64)}@example.com`)).toBeNull();
      expect(validateContactEmail(`${'a'.repeat(65)}@example.com`)).not.toBeNull();
    });

    it('accepts a 63 character domain label and rejects a 64 character domain label', () => {
      expect(validateContactEmail(`test@${'a'.repeat(63)}.com`)).toBeNull();
      expect(validateContactEmail(`test@${'a'.repeat(64)}.com`)).not.toBeNull();
    });

    it('accepts the maximum length and rejects values above it', () => {
      const maximumEmail = `${'a'.repeat(64)}@${'a'.repeat(63)}.${'a'.repeat(63)}.${'a'.repeat(61)}`;

      expect(maximumEmail).toHaveLength(CONTACT_EMAIL_MAX_LENGTH);
      expect(validateContactEmail(maximumEmail)).toBeNull();
      expect(validateContactEmail(`a${maximumEmail}`)?.kind).toBe('maxLength');
    });
  });

  describe('phone', () => {
    it.each([
      '',
      '   ',
      '12345',
      'abc123',
      'abc123456',
      'phone number',
      '12+345678',
      '++491511234567',
      '+49+1511234567',
    ])('rejects %j', (phone) => {
      expect(validateContactPhone(phone)).not.toBeNull();
    });

    it.each(['123456', '+49 151 1234567', '0049 151 1234567', '0228 123456', '+1 (555) 123-4567'])(
      'accepts %j',
      (phone) => {
        expect(validateContactPhone(phone)).toBeNull();
      },
    );

    it('accepts the maximum raw length and rejects values above it', () => {
      const maximumPhone = `+${'1'.repeat(CONTACT_PHONE_MAX_LENGTH - 1)}`;

      expect(maximumPhone).toHaveLength(CONTACT_PHONE_MAX_LENGTH);
      expect(validateContactPhone(maximumPhone)).toBeNull();
      expect(validateContactPhone(`${maximumPhone}1`)?.kind).toBe('maxLength');
    });
  });

  it('normalizes safe whitespace consistently', () => {
    expect(
      normalizeContactInput({
        name: "  Anne   Marie O'Connor  ",
        email: '  anne@example.com ',
        phone: ' +49 151 1234567  ',
      }),
    ).toEqual({
      name: "Anne Marie O'Connor",
      email: 'anne@example.com',
      phone: '+49 151 1234567',
    });
  });

  it('validates and normalizes a complete contact input', () => {
    const result = validateContactInput({
      name: '  Anna   Weber ',
      email: ' anna@example.de ',
      phone: ' +49 151 1234567 ',
    });

    expect(result).toEqual({
      valid: true,
      value: {
        name: 'Anna Weber',
        email: 'anna@example.de',
        phone: '+49 151 1234567',
      },
      errors: {},
    });
  });

  it('splits a normalized full name without requiring a last name', () => {
    expect(splitContactName('Li')).toEqual({ first_name: 'Li', last_name: '' });
    expect(splitContactName('Jean Luc Picard')).toEqual({
      first_name: 'Jean Luc',
      last_name: 'Picard',
    });
  });
});
