import {
  Component,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  input,
  output,
  signal,
} from '@angular/core';
import { Contact } from '../../../models/contact';
import { ContactActionsMenu } from './contact-actions-menu/contact-actions-menu';

@Component({
  selector: 'app-contact-detail',
  imports: [ContactActionsMenu],
  templateUrl: './contact-detail.html',
  styleUrl: './contact-detail.scss',
})
export class ContactDetail implements OnChanges, OnDestroy {
  readonly contact = input.required<Contact>();
  readonly detailEntered = signal(false);

  readonly editContact = output<Contact>();
  readonly deleteContact = output<Contact>();
  readonly back = output<void>();

  private animationFrame: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contact']) {
      this.restartEntranceAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cancelPendingAnimationFrame();
  }

  get fullName(): string {
    const contact = this.contact();

    return `${contact.first_name} ${contact.last_name}`.trim();
  }

  get initials(): string {
    const contact = this.contact();

    return `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`.toUpperCase();
  }

  private restartEntranceAnimation(): void {
    this.detailEntered.set(false);

    if (this.enterImmediatelyForReducedMotion()) {
      return;
    }

    this.cancelPendingAnimationFrame();
    this.scheduleEntranceAnimation();
  }

  private scheduleEntranceAnimation(): void {
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = requestAnimationFrame(() => {
        this.completeEntranceAnimation();
      });
    });
  }

  private completeEntranceAnimation(): void {
    this.detailEntered.set(true);
    this.animationFrame = null;
  }

  private cancelPendingAnimationFrame(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private enterImmediatelyForReducedMotion(): boolean {
    if (!this.prefersReducedMotion()) {
      return false;
    }

    this.detailEntered.set(true);
    return true;
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
