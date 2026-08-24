import { Component, input, output } from '@angular/core';
import type { ContactDialogState } from '../contact-dialog';

@Component({
  selector: 'app-contact-dialog-hero',
  imports: [],
  templateUrl: './contact-dialog-hero.html',
  styleUrl: './contact-dialog-hero.scss',
})
export class ContactDialogHero {
  readonly state = input.required<ContactDialogState>();
  readonly close = output<void>();

  get initials(): string {
    const state = this.state();

    if (state.mode === 'add') {
      return '';
    }

    return `${state.contact.first_name.charAt(0)}${state.contact.last_name.charAt(0)}`.toUpperCase();
  }
}
