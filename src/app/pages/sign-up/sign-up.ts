import { Component, signal } from '@angular/core';
import { FormField, email, form, minLength, required, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Button } from '../../shared/components/button/button';

@Component({
  selector: 'app-sign-up',
  imports: [RouterLink, Button, FormField],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp {
  readonly formModel = signal({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptPrivacy: false,
  });

  readonly signUpForm = form(this.formModel, (path) => {
    validate(path.name, ({ value }) =>
      value().trim() ? null : { kind: 'required', message: 'Name is required' },
    );
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Please enter a valid email address' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 8, { message: 'Password must be at least 8 characters' });
    required(path.confirmPassword, { message: 'Please confirm your password' });
    validate(path.confirmPassword, ({ value, valueOf }) =>
      value() && value() !== valueOf(path.password)
        ? { kind: 'passwordMismatch', message: 'Passwords do not match' }
        : null,
    );
    required(path.acceptPrivacy, { message: 'Please accept the Privacy policy' });
  });

  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  errorFor(field: keyof ReturnType<typeof this.formModel>): string | null {
    const state = this.signUpForm[field]();
    if (!state.touched()) return null;
    const errors = state.errors();
    return (errors.find((error) => error.kind === 'required') ?? errors[0])?.message ?? null;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.signUpForm().markAsTouched();
  }
}
