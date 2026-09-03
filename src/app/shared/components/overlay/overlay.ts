import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

let overlayCounter = 0;

@Component({
  selector: 'app-overlay',
  imports: [],
  templateUrl: './overlay.html',
  styleUrl: './overlay.scss',
  host: {
    '(keydown.escape)': 'requestClose()',
  },
})
export class Overlay {
  readonly heading = input.required<string>();
  readonly closeRequested = output<void>();

  private readonly instanceId = ++overlayCounter;
  readonly headingId = `overlay-heading-${this.instanceId}`;

  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  constructor() {
    afterNextRender(() => this.closeButton().nativeElement.focus());

    inject(DestroyRef).onDestroy(() => this.restorePreviousFocus());
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  /**
   * Closes when the backdrop itself was clicked, not when the click came from
   * the dialog inside it and only bubbled through.
   *
   * @param event - The click on the backdrop.
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  private restorePreviousFocus(): void {
    const target = this.previouslyFocused;

    if (target && target.isConnected && typeof target.focus === 'function') {
      target.focus();
    }
  }
}
