import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Login } from './login';
import { AuthService } from '../../services/auth';

class AuthServiceStub {
  signInWithPassword = vi.fn(async () => true);
  signInAnonymously = vi.fn(async () => true);
  error = () => this.errorMessage;
  errorMessage: string | null = null;
}

/** Silences real navigation and records where the component tried to go. */
function stubNavigation() {
  return vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
}

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let auth: AuthServiceStub;
  let navigate: ReturnType<typeof stubNavigation>;

  beforeEach(async () => {
    auth = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    navigate = stubNavigation();
    await fixture.whenStable();
  });

  const submit = async () => {
    await component.onSubmit(new Event('submit'));
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rejects an empty form without calling the service', async () => {
    await submit();

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects an address that is not a valid email', async () => {
    component.formModel.set({ email: 'not-an-email', password: 'secret123' });
    await submit();

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in and goes to the summary', async () => {
    component.formModel.set({ email: 'user@example.com', password: 'secret123' });
    await submit();

    expect(auth.signInWithPassword).toHaveBeenCalledWith('user@example.com', 'secret123');
    expect(navigate).toHaveBeenCalledWith(['/summary']);
  });

  it('stays on the page and shows the reason when the credentials are wrong', async () => {
    auth.signInWithPassword = vi.fn(async () => false);
    auth.errorMessage = 'Invalid login credentials';
    component.formModel.set({ email: 'user@example.com', password: 'wrong-password' });
    await submit();

    expect(navigate).not.toHaveBeenCalled();
    expect(component.signInError()).toBe('Invalid login credentials');
    expect(component.submitting()).toBe(false);
  });

  it('signs in a guest anonymously and goes to the summary', async () => {
    await component.onGuestLogin();
    await fixture.whenStable();

    expect(auth.signInAnonymously).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/summary']);
  });

  it('shows a message when the guest sign-in fails', async () => {
    auth.signInAnonymously = vi.fn(async () => false);
    auth.errorMessage = 'Anonymous sign-ins are disabled';
    await component.onGuestLogin();
    await fixture.whenStable();

    expect(component.signInError()).toBe('Anonymous sign-ins are disabled');
  });

  it('toggles password visibility', () => {
    expect(component.passwordVisible()).toBe(false);

    component.passwordVisible.set(true);
    expect(component.passwordVisible()).toBe(true);
  });

  it('plays the intro only on the first component of a page load', async () => {
    // The first instance was created in beforeEach and consumed the flag.
    const second = TestBed.createComponent(Login);
    await second.whenStable();

    expect(second.componentInstance.introPending()).toBe(false);
  });
});
