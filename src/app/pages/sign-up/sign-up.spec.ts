import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SignUp } from './sign-up';
import { AuthService } from '../../services/auth';

class AuthServiceStub {
  signUp = vi.fn(async () => true);
  error = () => this.errorMessage;
  errorMessage: string | null = null;
}

describe('SignUp', () => {
  let auth: AuthServiceStub;
  let fixture: ComponentFixture<SignUp>;
  let component: SignUp;
  let page: HTMLElement;

  beforeEach(async () => {
    auth = new AuthServiceStub();
    await TestBed.configureTestingModule({
      imports: [SignUp],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(SignUp);
    component = fixture.componentInstance;
    await fixture.whenStable();
    page = fixture.nativeElement;
  });

  function input(name: string): HTMLInputElement {
    const id = name === 'acceptPrivacy' ? 'privacy-consent' : 'sign-up-' + name;
    return page.querySelector<HTMLInputElement>('#' + id)!;
  }

  function submitButton(): HTMLButtonElement {
    return page.querySelector<HTMLButtonElement>('app-button button')!;
  }

  function setValidForm(): void {
    component.formModel.set({
      name: 'Anna Weber',
      email: 'anna@example.org',
      password: 'Password123',
      confirmPassword: 'Password123',
      acceptPrivacy: true,
    });
    fixture.detectChanges();
  }

  it('creates the page with logo, heading and the shared submit button', () => {
    expect(component).toBeTruthy();
    expect(page.querySelector('h1')?.textContent).toBe('Sign up');
    expect(page.querySelector('img[alt="Join"]')).toBeTruthy();
    expect(submitButton().type).toBe('submit');
    expect(submitButton().textContent?.trim()).toBe('Sign up');
  });

  it('renders four labelled fields with stable IDs, types and autocomplete', () => {
    const fields = Array.from(page.querySelectorAll<HTMLInputElement>('.fields input'));
    expect(fields.map((field) => field.type)).toEqual(['text', 'email', 'password', 'password']);
    expect(fields.map((field) => field.autocomplete)).toEqual([
      'name',
      'email',
      'new-password',
      'new-password',
    ]);
    expect(fields.map((field) => field.labels?.[0]?.textContent)).toEqual([
      'Name',
      'Email',
      'Password',
      'Confirm Password',
    ]);
    expect(new Set(fields.map((field) => field.id)).size).toBe(4);
  });

  it('targets login from the accessible Back link', () => {
    expect(page.querySelector('a[aria-label="Back to login"]')?.getAttribute('href')).toBe(
      '/login',
    );
  });

  it('targets the existing inline and footer legal routes', () => {
    expect(page.querySelector('.privacy-row a')?.getAttribute('href')).toBe('/privacy-policy');
    const links = Array.from(page.querySelectorAll('footer a'));
    expect(links.map((link) => link.textContent)).toEqual(['Privacy Policy', 'Legal notice']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/privacy-policy',
      '/legal-notice',
    ]);
  });

  it('starts invalid and disabled without exposed errors', () => {
    expect(component.signUpForm().invalid()).toBe(true);
    expect(submitButton().disabled).toBe(true);
    expect(page.querySelector('.field-error')).toBeNull();
    expect(page.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(page.querySelector('form')?.noValidate).toBe(true);
  });

  it.each([
    ['name', '', 'Name is required'],
    ['name', '   \t ', 'Name is required'],
    ['email', '', 'Email is required'],
    ['email', 'not-an-email', 'Please enter a valid email address'],
    ['password', '', 'Password is required'],
    ['password', '1234567', 'Password must be at least 8 characters'],
    ['confirmPassword', '', 'Please confirm your password'],
    ['confirmPassword', 'Different123', 'Passwords do not match'],
  ] as const)(
    'rejects %s value %j and exposes its distinct message after touch',
    (field, value, message) => {
      setValidForm();
      component.formModel.update((model) => ({ ...model, [field]: value }));
      expect(component.signUpForm[field]().invalid()).toBe(true);
      expect(component.errorFor(field)).toBeNull();
      component.signUpForm[field]().markAsTouched();
      fixture.detectChanges();
      expect(component.errorFor(field)).toBe(message);
      expect(submitButton().disabled).toBe(true);
    },
  );

  it('accepts a valid email and the exact eight-character password boundary', () => {
    setValidForm();
    component.formModel.update((model) => ({
      ...model,
      email: 'anna+tag@sub.example.org',
      password: '12345678',
      confirmPassword: '12345678',
    }));
    expect(component.signUpForm.email().valid()).toBe(true);
    expect(component.signUpForm().valid()).toBe(true);
  });

  it('revalidates confirmation when the original password changes', () => {
    setValidForm();
    component.formModel.update((model) => ({ ...model, password: 'Changed123' }));
    expect(component.signUpForm.confirmPassword().invalid()).toBe(true);
    component.formModel.update((model) => ({ ...model, confirmPassword: 'Changed123' }));
    expect(component.signUpForm().valid()).toBe(true);
  });

  it('matches passwords exactly without trimming or changing case', () => {
    setValidForm();
    component.formModel.update((model) => ({ ...model, confirmPassword: 'password123' }));
    expect(component.signUpForm.confirmPassword().invalid()).toBe(true);
    component.formModel.update((model) => ({ ...model, confirmPassword: 'Password123 ' }));
    expect(component.signUpForm.confirmPassword().invalid()).toBe(true);
  });

  it('binds typed input, exposes an associated error on blur and clears it on correction', async () => {
    const emailInput = input('email');
    emailInput.value = 'bad';
    emailInput.dispatchEvent(new Event('input'));
    emailInput.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(component.formModel().email).toBe('bad');
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    const errorId = emailInput.getAttribute('aria-describedby')!;
    expect(page.querySelector('#' + errorId)?.textContent).toContain(
      'Please enter a valid email address',
    );
    emailInput.value = 'anna@example.org';
    emailInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(emailInput.getAttribute('aria-invalid')).not.toBe('true');
    expect(emailInput.hasAttribute('aria-describedby')).toBe(false);
  });

  it.each([
    ['password', 'confirmPassword', 'password'],
    ['confirmPassword', 'password', 'confirm password'],
  ] as const)(
    'toggles %s independently without submitting or changing its value',
    async (field, other, label) => {
      setValidForm();
      const onSubmit = vi.spyOn(component, 'onSubmit');
      const toggle = page.querySelector<HTMLButtonElement>(
        'button[aria-label="Show ' + label + '"]',
      )!;
      expect(toggle.type).toBe('button');
      toggle.click();
      await fixture.whenStable();
      expect(input(field).type).toBe('text');
      expect(input(other).type).toBe('password');
      expect(toggle.getAttribute('aria-label')).toBe('Hide ' + label);
      expect(input(field).value).toBe('Password123');
      toggle.click();
      await fixture.whenStable();
      expect(input(field).type).toBe('password');
      expect(toggle.getAttribute('aria-label')).toBe('Show ' + label);
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it('requires true privacy consent and updates the real disabled button when toggled', async () => {
    setValidForm();
    expect(submitButton().disabled).toBe(false);
    input('acceptPrivacy').click();
    await fixture.whenStable();
    expect(component.formModel().acceptPrivacy).toBe(false);
    expect(component.signUpForm.acceptPrivacy().invalid()).toBe(true);
    expect(submitButton().disabled).toBe(true);
    input('acceptPrivacy').click();
    await fixture.whenStable();
    expect(component.signUpForm.acceptPrivacy().valid()).toBe(true);
    expect(submitButton().disabled).toBe(false);
  });

  it('does not enable submit for consent alone', () => {
    component.formModel.update((model) => ({ ...model, acceptPrivacy: true }));
    fixture.detectChanges();
    expect(submitButton().disabled).toBe(true);
  });

  it('does not toggle consent when the Privacy Policy link is clicked', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    page.querySelector<HTMLAnchorElement>('.privacy-row a')!.click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalled();
    expect(component.formModel().acceptPrivacy).toBe(false);
    expect(input('acceptPrivacy').checked).toBe(false);
  });

  it('marks invalid controls touched on attempted submit without native submission or navigation', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    const event = new Event('submit', { cancelable: true, bubbles: true });
    page.querySelector('form')!.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(page.querySelectorAll('.field-error')).toHaveLength(5);
    expect(input('acceptPrivacy').getAttribute('aria-describedby')).toBe('privacy-error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('registers valid form data and navigates to login', async () => {
    setValidForm();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const event = new Event('submit', { cancelable: true });

    await component.onSubmit(event);

    expect(event.defaultPrevented).toBe(true);
    expect(auth.signUp).toHaveBeenCalledWith('Anna Weber', 'anna@example.org', 'Password123');
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(component.signUpError()).toBeNull();
  });

  it('shows the backend error and unlocks the form when registration fails', async () => {
    auth.signUp.mockResolvedValue(false);
    auth.errorMessage = 'User already registered';
    setValidForm();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    await component.onSubmit(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(component.signUpError()).toBe('User already registered');
    expect(component.submitting()).toBe(false);
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('User already registered');
    expect(submitButton().disabled).toBe(false);
  });
});
