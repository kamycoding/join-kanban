import { Component, OnInit, input, output, signal } from '@angular/core';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { Contact } from '../../../models/contact';
import { Button } from '../../../shared/components/button/button';

export interface ContactFormValue {
  name: string;
  email: string;
  phone: string;
}

export type ContactDialogState = { mode: 'add' } | { mode: 'edit'; contact: Contact };

@Component({
  selector: 'app-contact-dialog',
  imports: [Button, FormField],
  templateUrl: './contact-dialog.html',
  styleUrl: './contact-dialog.scss',
})
export class ContactDialog implements OnInit {
  readonly state = input.required<ContactDialogState>();
  readonly saving = input(false);

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

  ngOnInit(): void {
    const state = this.state();

    if (state.mode === 'edit') {
      this.prefillForm(state.contact);
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    await submit(this.contactForm, async (field) => {
      const value = field().value();

      this.submitted.emit({
        name: value.name.trim(),
        email: value.email.trim(),
        phone: value.phone.trim(),
      });
    });
  }

  private prefillForm(contact: Contact): void {
    this.formModel.set({
      name: `${contact.first_name} ${contact.last_name}`.trim(),
      email: contact.email,
      phone: contact.phone,
    });
  }
}
