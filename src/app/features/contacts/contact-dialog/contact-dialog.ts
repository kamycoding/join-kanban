import { Component, OnInit, afterNextRender, input, output, signal } from '@angular/core';
import { form, FormField, submit, validate } from '@angular/forms/signals';
import { Contact } from '../../../models/contact';
import {
  ContactInput,
  validateContactEmail,
  validateContactInput,
  validateContactName,
  validateContactPhone,
} from '../../../models/contact-validation';
import { Button } from '../../../shared/components/button/button';
import { ContactDialogHero } from './contact-dialog-hero/contact-dialog-hero';

export type ContactFormValue = ContactInput;

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
    validate(path.name, ({ value }) => validateContactName(value()));
    validate(path.email, ({ value }) => validateContactEmail(value()));
    validate(path.phone, ({ value }) => validateContactPhone(value()));
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
    const result = validateContactInput(value);

    if (result.valid) {
      this.submitted.emit(result.value);
    }
  }
}
