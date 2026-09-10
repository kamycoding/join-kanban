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

  /**
   * Responds to changes in the component inputs.
   *
   * @param changes - The changes to apply.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contact']) {
      this.restartEntranceAnimation();
    }
  }

  /**
   * Releases pending work and resources owned by the component.
   */
  ngOnDestroy(): void {
    this.cancelPendingAnimationFrame();
  }

  /**
   * Returns the contact's full name.
   *
   * @returns The resulting string.
   */
  get fullName(): string {
    const contact = this.contact();

    return `${contact.first_name} ${contact.last_name}`.trim();
  }

  /**
   * Returns the contact's display initials.
   *
   * @returns The resulting string.
   */
  get initials(): string {
    const contact = this.contact();

    return `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`.toUpperCase();
  }

  /**
   * Performs the restart entrance animation operation.
   */
  private restartEntranceAnimation(): void {
    this.detailEntered.set(false);

    if (this.enterImmediatelyForReducedMotion()) {
      return;
    }

    this.cancelPendingAnimationFrame();
    this.scheduleEntranceAnimation();
  }

  /**
   * Schedules entrance animation.
   */
  private scheduleEntranceAnimation(): void {
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = requestAnimationFrame(() => {
        this.completeEntranceAnimation();
      });
    });
  }

  /**
   * Completes entrance animation.
   */
  private completeEntranceAnimation(): void {
    this.detailEntered.set(true);
    this.animationFrame = null;
  }

  /**
   * Cancels pending animation frame.
   */
  private cancelPendingAnimationFrame(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Performs the enter immediately for reduced motion operation.
   *
   * @returns Whether the requested condition is met.
   */
  private enterImmediatelyForReducedMotion(): boolean {
    if (!this.prefersReducedMotion()) {
      return false;
    }

    this.detailEntered.set(true);
    return true;
  }

  /**
   * Determines whether the user prefers reduced motion.
   *
   * @returns Whether the requested condition is met.
   */
  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
