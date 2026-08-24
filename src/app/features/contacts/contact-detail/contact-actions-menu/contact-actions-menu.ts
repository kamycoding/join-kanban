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

  ngOnDestroy(): void {
    this.cancelPendingAnimationFrame();
  }

  toggleMenu(): void {
    if (this.menuOpen() || (this.menuRendered() && !this.menuClosing)) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  editCurrentContact(): void {
    this.closeMenu();
    this.editContact.emit(this.contact());
  }

  deleteCurrentContact(): void {
    this.closeMenu();
    this.deleteContact.emit(this.contact());
  }

  onTransitionEnd(event: TransitionEvent): void {
    const isOwnOpacityTransition =
      event.target === event.currentTarget && event.propertyName === 'opacity';

    if (this.menuClosing && isOwnOpacityTransition) {
      this.finishExit();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuRendered() || this.isInsideMenu(event)) {
      return;
    }

    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

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

  private startEntrance(): void {
    if (this.prefersReducedMotion()) {
      this.menuOpen.set(true);
      return;
    }

    this.animationFrame = requestAnimationFrame(() => this.finishEntrance());
  }

  private finishEntrance(): void {
    if (!this.menuClosing) {
      this.menuOpen.set(true);
    }

    this.animationFrame = null;
  }

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

  private finishExit(): void {
    this.menuRendered.set(false);
    this.menuClosing = false;
  }

  private cancelPendingAnimationFrame(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private isInsideMenu(event: MouseEvent): boolean {
    return this.elementRef.nativeElement.contains(event.target as Node);
  }

  private restoreTriggerFocus(): void {
    const activeElement = document.activeElement;

    if (activeElement && this.popup()?.nativeElement.contains(activeElement)) {
      this.trigger()?.nativeElement.focus();
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
