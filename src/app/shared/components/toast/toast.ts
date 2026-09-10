import { Component, OnDestroy, afterNextRender, input, output, signal } from '@angular/core';

const DEFAULT_VISIBLE_DURATION_MS = 1500;
type ToastPhase = 'entering' | 'visible' | 'exiting' | 'dismissed';

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast implements OnDestroy {
  readonly message = input.required<string>();
  readonly visibleDuration = input(DEFAULT_VISIBLE_DURATION_MS);
  readonly dismissed = output<void>();
  readonly entered = signal(false);
  readonly exiting = signal(false);

  private animationFrame: number | null = null;
  private visibleTimer: ReturnType<typeof setTimeout> | null = null;
  private phase: ToastPhase = 'entering';

  /**
   * Initializes the instance and registers its required lifecycle behavior.
   */
  constructor() {
    afterNextRender(() => this.startLifecycle());
  }

  /**
   * Releases pending work and resources owned by the component.
   */
  ngOnDestroy(): void {
    this.clearPendingWork();
  }

  /**
   * Handles completion of a CSS transition.
   *
   * @param event - The event to handle.
   */
  onTransitionEnd(event: TransitionEvent): void {
    if (!this.isOwnTransition(event)) {
      return;
    }

    if (this.phase === 'entering' && event.propertyName === 'transform') {
      this.finishEntrance();
    } else if (this.phase === 'exiting' && event.propertyName === 'opacity') {
      this.finishExit();
    }
  }

  /**
   * Starts lifecycle.
   */
  private startLifecycle(): void {
    if (this.prefersReducedMotion()) {
      this.entered.set(true);
      this.phase = 'visible';
      this.scheduleExit();
      return;
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.entered.set(true);
      this.animationFrame = null;
    });
  }

  /**
   * Schedules exit.
   */
  private scheduleExit(): void {
    this.visibleTimer = setTimeout(() => this.startExit(), this.visibleDuration());
  }

  /**
   * Starts exit.
   */
  private startExit(): void {
    if (this.phase !== 'visible') {
      return;
    }

    this.phase = 'exiting';
    this.exiting.set(true);
    this.entered.set(false);
    this.visibleTimer = null;

    if (this.prefersReducedMotion()) {
      this.finishExit();
    }
  }

  /**
   * Finishes entrance.
   */
  private finishEntrance(): void {
    this.phase = 'visible';
    this.scheduleExit();
  }

  /**
   * Finishes exit.
   */
  private finishExit(): void {
    this.phase = 'dismissed';
    this.dismissed.emit();
  }

  /**
   * Determines whether the own transition.
   *
   * @param event - The event to handle.
   * @returns Whether the requested condition is met.
   */
  private isOwnTransition(event: TransitionEvent): boolean {
    return event.target === event.currentTarget;
  }

  /**
   * Clears pending work.
   */
  private clearPendingWork(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.visibleTimer !== null) {
      clearTimeout(this.visibleTimer);
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
