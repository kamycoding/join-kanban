import { Component, OnDestroy, afterNextRender, input, output, signal } from '@angular/core';

const VISIBLE_DURATION_MS = 1500;
type ToastPhase = 'entering' | 'visible' | 'exiting' | 'dismissed';

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast implements OnDestroy {
  readonly message = input.required<string>();
  readonly dismissed = output<void>();
  readonly entered = signal(false);
  readonly exiting = signal(false);

  private animationFrame: number | null = null;
  private visibleTimer: ReturnType<typeof setTimeout> | null = null;
  private phase: ToastPhase = 'entering';

  constructor() {
    afterNextRender(() => this.startLifecycle());
  }

  ngOnDestroy(): void {
    this.clearPendingWork();
  }

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

  private scheduleExit(): void {
    this.visibleTimer = setTimeout(() => this.startExit(), VISIBLE_DURATION_MS);
  }

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

  private finishEntrance(): void {
    this.phase = 'visible';
    this.scheduleExit();
  }

  private finishExit(): void {
    this.phase = 'dismissed';
    this.dismissed.emit();
  }

  private isOwnTransition(event: TransitionEvent): boolean {
    return event.target === event.currentTarget;
  }

  private clearPendingWork(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.visibleTimer !== null) {
      clearTimeout(this.visibleTimer);
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
