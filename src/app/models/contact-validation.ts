export const CONTACT_NAME_MAX_LENGTH = 100;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const CONTACT_PHONE_MAX_LENGTH = 32;

export interface ContactInput {
  name: string;
  email: string;
  phone: string;
}

export interface ContactValidationIssue {
  kind: 'required' | 'minLength' | 'maxLength' | 'email' | 'phone';
  message: string;
}

export type ContactValidationErrors = Partial<Record<keyof ContactInput, ContactValidationIssue>>;

export type ContactValidationResult =
  | { valid: true; value: ContactInput; errors: ContactValidationErrors }
  | { valid: false; value: ContactInput; errors: ContactValidationErrors };

const PHONE_FORMAT = /^\+?[\d\s()-]+$/;
const EMAIL_LOCAL_PART = /^[a-z\d.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL = /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i;
const TOP_LEVEL_DOMAIN = /^[a-z]{2,}$/i;

export function normalizeContactInput(input: ContactInput): ContactInput {
  return {
    name: normalizeContactName(input.name),
    email: input.email.trim(),
    phone: input.phone.trim(),
  };
}

export function validateContactName(value: string): ContactValidationIssue | null {
  const name = normalizeContactName(value);

  if (!name) {
    return { kind: 'required', message: 'Name is required.' };
  }

  if (name.length < 2) {
    return { kind: 'minLength', message: 'Name must have at least 2 characters.' };
  }

  if (name.length > CONTACT_NAME_MAX_LENGTH) {
    return {
      kind: 'maxLength',
      message: `Name must have ${CONTACT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  return null;
}

export function validateContactEmail(value: string): ContactValidationIssue | null {
  const email = value.trim();

  if (!email) {
    return { kind: 'required', message: 'Email is required.' };
  }

  if (email.length > CONTACT_EMAIL_MAX_LENGTH) {
    return {
      kind: 'maxLength',
      message: `Email must have ${CONTACT_EMAIL_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!isPracticalEmail(email)) {
    return { kind: 'email', message: 'Enter a valid email address.' };
  }

  return null;
}

export function validateContactPhone(value: string): ContactValidationIssue | null {
  const phone = value.trim();

  if (!phone) {
    return { kind: 'required', message: 'Phone is required.' };
  }

  if (phone.length > CONTACT_PHONE_MAX_LENGTH) {
    return {
      kind: 'maxLength',
      message: `Phone must have ${CONTACT_PHONE_MAX_LENGTH} characters or fewer.`,
    };
  }

  const digitCount = phone.replace(/\D/g, '').length;

  if (!PHONE_FORMAT.test(phone) || digitCount < 6) {
    return { kind: 'phone', message: 'Enter a valid phone number.' };
  }

  return null;
}

export function validateContactInput(input: ContactInput): ContactValidationResult {
  const value = normalizeContactInput(input);
  const errors: ContactValidationErrors = {};

  const nameError = validateContactName(value.name);
  const emailError = validateContactEmail(value.email);
  const phoneError = validateContactPhone(value.phone);

  if (nameError) {
    errors.name = nameError;
  }

  if (emailError) {
    errors.email = emailError;
  }

  if (phoneError) {
    errors.phone = phoneError;
  }

  return Object.keys(errors).length === 0
    ? { valid: true, value, errors }
    : { valid: false, value, errors };
}

export function splitContactName(fullName: string): {
  first_name: string;
  last_name: string;
} {
  const nameParts = normalizeContactName(fullName).split(' ');

  if (nameParts.length === 1) {
    return { first_name: nameParts[0], last_name: '' };
  }

  const lastName = nameParts.pop()!;

  return {
    first_name: nameParts.join(' '),
    last_name: lastName,
  };
}

function normalizeContactName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isPracticalEmail(email: string): boolean {
  if (/\s/.test(email)) {
    return false;
  }

  const parts = email.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }

  const localPart = parts[0];

  if (
    !EMAIL_LOCAL_PART.test(localPart) ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..')
  ) {
    return false;
  }

  const domainParts = parts[1].split('.');

  if (domainParts.length < 2 || domainParts.some((part) => !DOMAIN_LABEL.test(part))) {
    return false;
  }

  return TOP_LEVEL_DOMAIN.test(domainParts.at(-1)!);
}
