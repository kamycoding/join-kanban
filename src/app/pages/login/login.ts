import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth';
import { Button } from '../../shared/components/button/button';

/**
 * The intro animation runs once per page load. A module-level flag survives the
 * component being torn down and recreated by the router, but not a reload, so
 * navigating away and back does not replay it while F5 still does.
 */
let introPlayed = false;

@Component({
  selector: 'app-login',
  imports: [RouterLink, Button, FormField],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly formModel = signal({
    email: '',
    password: '',
  });

  readonly loginForm = form(this.formModel, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Please enter a valid email address' });
    required(path.password, { message: 'Password is required' });
  });

  readonly passwordVisible = signal(false);

  /** Blocks both buttons while a request is in flight. */
  readonly submitting = signal(false);

  /** Message from a failed sign-in, shown above the buttons. */
  readonly signInError = signal<string | null>(null);

  readonly introPending = signal(!introPlayed);

  /**
   * Initializes the instance and registers its required lifecycle behavior.
   */
  constructor() {
    introPlayed = true;
  }

  /**
   * Returns the validation error for the requested form field.
   *
   * @param field - The form field to inspect.
   * @returns The resulting value, or `null` when unavailable.
   */
  errorFor(field: keyof ReturnType<typeof this.formModel>): string | null {
    const state = this.loginForm[field]();
    if (!state.touched()) return null;
    const errors = state.errors();
    return (errors.find((error) => error.kind === 'required') ?? errors[0])?.message ?? null;
  }

  /**
   * Handles submission of the current form.
   *
   * @param event - The event to handle.
   */
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.loginForm().markAsTouched();

    if (this.loginForm().invalid() || this.submitting()) {
      return;
    }

    const { email: address, password } = this.formModel();
    await this.attempt(() => this.auth.signInWithPassword(address, password));
  }

  /**
   * Handles guest login.
   */
  async onGuestLogin(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    await this.attempt(() => this.auth.signInAnonymously());
  }

  /**
   * Wraps a sign-in call: locks the buttons, routes on success and otherwise
   * keeps the user on the page with the reason visible.
   */
  private async attempt(signIn: () => Promise<boolean>): Promise<void> {
    this.submitting.set(true);
    this.signInError.set(null);

    const signedIn = await signIn();

    if (signedIn) {
      await this.router.navigate(['/summary']);
      return;
    }

    this.signInError.set(this.auth.error() ?? 'Sign in failed. Please try again.');
    this.submitting.set(false);
  }
}
