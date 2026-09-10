import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Contact } from '../../../../models/contact';

@Component({
  selector: 'app-contact-actions-menu',
  imports: [],
  templateUrl: './contact-actions-menu.html',
  styleUrl: './contact-actions-menu.scss',
})
export class ContactActionsMenu implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly popup = viewChild<ElementRef<HTMLElement>>('popup');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly contact = input.required<Contact>();
  readonly editContact = output<Contact>();
  readonly deleteContact = output<Contact>();
  readonly menuRendered = signal(false);
  readonly menuOpen = signal(false);

  private animationFrame: number | null = null;
  private menuClosing = false;

  /**
   * Releases pending work and resources owned by the component.
   */
  ngOnDestroy(): void {
    this.cancelPendingAnimationFrame();
  }

  /**
   * Toggles menu.
   */
  toggleMenu(): void {
    if (this.menuOpen() || (this.menuRendered() && !this.menuClosing)) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  /**
   * Performs the edit current contact operation.
   */
  editCurrentContact(): void {
    this.closeMenu();
    this.editContact.emit(this.contact());
  }

  /**
   * Removes current contact.
   */
  deleteCurrentContact(): void {
    this.closeMenu();
    this.deleteContact.emit(this.contact());
  }

  /**
   * Handles completion of a CSS transition.
   *
   * @param event - The event to handle.
   */
  onTransitionEnd(event: TransitionEvent): void {
    const isOwnOpacityTransition =
      event.target === event.currentTarget && event.propertyName === 'opacity';

    if (this.menuClosing && isOwnOpacityTransition) {
      this.finishExit();
    }
  }

  /**
   * Handles document clicks that occur outside the component.
   *
   * @param event - The event to handle.
   */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuRendered() || this.isInsideMenu(event)) {
      return;
    }

    this.closeMenu();
  }

  /**
   * Handles the Escape key action.
   */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

  /**
   * Opens menu.
   */
  private openMenu(): void {
    this.cancelPendingAnimationFrame();
    this.menuClosing = false;

    if (this.menuRendered()) {
      this.menuOpen.set(true);
      return;
    }

    this.menuRendered.set(true);
    this.startEntrance();
  }

  /**
   * Starts entrance.
   */
  private startEntrance(): void {
    if (this.prefersReducedMotion()) {
      this.menuOpen.set(true);
      return;
    }

    this.animationFrame = requestAnimationFrame(() => this.finishEntrance());
  }

  /**
   * Finishes entrance.
   */
  private finishEntrance(): void {
    if (!this.menuClosing) {
      this.menuOpen.set(true);
    }

    this.animationFrame = null;
  }

  /**
   * Closes menu.
   */
  private closeMenu(): void {
    if (!this.menuRendered()) {
      return;
    }

    const wasOpen = this.menuOpen();
    this.cancelPendingAnimationFrame();
    this.restoreTriggerFocus();
    this.menuOpen.set(false);

    if (this.prefersReducedMotion() || !wasOpen) {
      this.finishExit();
      return;
    }

    this.menuClosing = true;
  }

  /**
   * Finishes exit.
   */
  private finishExit(): void {
    this.menuRendered.set(false);
    this.menuClosing = false;
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
   * Determines whether the inside menu.
   *
   * @param event - The event to handle.
   * @returns Whether the requested condition is met.
   */
  private isInsideMenu(event: MouseEvent): boolean {
    return this.elementRef.nativeElement.contains(event.target as Node);
  }

  /**
   * Restores trigger focus.
   */
  private restoreTriggerFocus(): void {
    const activeElement = document.activeElement;

    if (activeElement && this.popup()?.nativeElement.contains(activeElement)) {
      this.trigger()?.nativeElement.focus();
    }
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
