import { Component, OnInit, afterNextRender, input, output, signal } from '@angular/core';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { Contact } from '../../../models/contact';
import { Button } from '../../../shared/components/button/button';
import { ContactDialogHero } from './contact-dialog-hero/contact-dialog-hero';

export interface ContactFormValue {
  name: string;
  email: string;
  phone: string;
}

export type ContactDialogState = { mode: 'add' } | { mode: 'edit'; contact: Contact };

@Component({
  selector: 'app-contact-dialog',
  imports: [Button, ContactDialogHero, FormField],
  templateUrl: './contact-dialog.html',
  styleUrl: './contact-dialog.scss',
})
export class ContactDialog implements OnInit {
  readonly state = input.required<ContactDialogState>();
  readonly saving = input(false);
  readonly dialogEntered = signal(false);

  readonly close = output<void>();
  readonly submitted = output<ContactFormValue>();
  readonly deleteContact = output<Contact>();

  readonly formModel = signal<ContactFormValue>({
    name: '',
    email: '',
    phone: '',
  });

  readonly contactForm = form(this.formModel, (path) => {
    validate(path.name, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: 'Name is required.',
          },
    );

    required(path.email, {
      message: 'Email is required.',
    });

    email(path.email, {
      message: 'Please enter a valid email address.',
    });

    validate(path.phone, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: 'Phone is required.',
          },
    );

    validate(path.phone, ({ value }) => {
      const phone = value().trim();

      if (!phone) {
        return null;
      }

      const hasValidCharacters = /^[\d\s+()-]+$/.test(phone);
      const hasEnoughDigits = phone.replace(/\D/g, '').length >= 6;

      return hasValidCharacters && hasEnoughDigits
        ? null
        : {
            kind: 'phone',
            message: 'Please enter a valid phone number.',
          };
    });
  });

  private isClosing = false;

  constructor() {
    afterNextRender(() => {
      requestAnimationFrame(() => {
        if (!this.isClosing) {
          this.dialogEntered.set(true);
        }
      });
    });
  }

  ngOnInit(): void {
    const state = this.state();

    if (state.mode === 'edit') {
      this.prefillForm(state.contact);
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.saving()) {
      return;
    }

    await submit(this.contactForm, async (field) => this.emitFormValue(field().value()));
  }

  onDelete(contact: Contact): void {
    if (!this.saving()) {
      this.deleteContact.emit(contact);
    }
  }

  requestClose(): void {
    if (!this.dialogEntered() || this.prefersReducedMotion()) {
      this.close.emit();
      return;
    }

    if (!this.isClosing) {
      this.isClosing = true;
      this.dialogEntered.set(false);
    }
  }

  onDialogTransitionEnd(event: TransitionEvent): void {
    const isDialogTransform =
      event.target === event.currentTarget && event.propertyName === 'transform';

    if (this.isClosing && isDialogTransform) {
      this.close.emit();
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private prefillForm(contact: Contact): void {
    this.formModel.set({
      name: `${contact.first_name} ${contact.last_name}`.trim(),
      email: contact.email,
      phone: contact.phone,
    });
  }

  private emitFormValue(value: ContactFormValue): void {
    this.submitted.emit({
      name: value.name.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
    });
  }
}
