import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Toast } from './toast';

describe('Toast', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toast],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the supplied message', () => {
    const fixture = createToast('Contact successfully created');

    expect(fixture.nativeElement.textContent).toContain('Contact successfully created');
  });

  it('enters on the next animation frame', () => {
    let enterFrame: FrameRequestCallback | undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        enterFrame = callback;
        return 1;
      }),
    );
    const fixture = createToast('Contact successfully created');

    expect(fixture.componentInstance.entered()).toBe(false);
    enterFrame?.(0);

    expect(fixture.componentInstance.entered()).toBe(true);
  });

  it('starts exiting after the visible duration and dismisses after the exit transition', () => {
    vi.useFakeTimers();
    const fixture = createToast('Contact successfully created');
    const component = fixture.componentInstance;
    const dismissed = vi.fn();
    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    component.dismissed.subscribe(dismissed);
    component.entered.set(true);

    vi.advanceTimersByTime(1500);
    expect(component.entered()).toBe(true);

    component.onTransitionEnd(transformTransitionFor(toast));
    vi.advanceTimersByTime(1499);
    expect(component.entered()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(component.entered()).toBe(false);
    expect(dismissed).not.toHaveBeenCalled();

    component.onTransitionEnd(transitionFor(toast, 'opacity'));
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('ignores duplicate entrance and exit transition events', () => {
    vi.useFakeTimers();
    const fixture = createToast('Contact successfully created');
    const component = fixture.componentInstance;
    const dismissed = vi.fn();
    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    const transition = transformTransitionFor(toast);
    component.dismissed.subscribe(dismissed);
    component.entered.set(true);

    component.onTransitionEnd(transition);
    component.onTransitionEnd(transition);
    vi.advanceTimersByTime(1500);
    const exitTransition = transitionFor(toast, 'opacity');
    component.onTransitionEnd(exitTransition);
    component.onTransitionEnd(exitTransition);

    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('uses transform for entrance and opacity for exit completion', () => {
    vi.useFakeTimers();
    const fixture = createToast('Contact successfully created');
    const component = fixture.componentInstance;
    const dismissed = vi.fn();
    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    component.dismissed.subscribe(dismissed);
    component.entered.set(true);

    component.onTransitionEnd(transitionFor(toast, 'opacity'));
    vi.advanceTimersByTime(1500);
    expect(component.entered()).toBe(true);

    component.onTransitionEnd(transformTransitionFor(toast));
    vi.advanceTimersByTime(1500);
    component.onTransitionEnd(transformTransitionFor(toast));
    expect(dismissed).not.toHaveBeenCalled();

    component.onTransitionEnd(transitionFor(toast, 'opacity'));
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('removes immediately after the visible duration when reduced motion is preferred', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const fixture = TestBed.createComponent(Toast);
    const dismissed = vi.fn();
    fixture.componentRef.setInput('message', 'Contact successfully created');
    fixture.componentInstance.dismissed.subscribe(dismissed);
    fixture.detectChanges();

    expect(fixture.componentInstance.entered()).toBe(true);
    vi.advanceTimersByTime(1500);

    expect(dismissed).toHaveBeenCalledOnce();
  });

  function createToast(message: string): ComponentFixture<Toast> {
    const fixture = TestBed.createComponent(Toast);
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();
    return fixture;
  }

  function transformTransitionFor(element: HTMLElement): TransitionEvent {
    return transitionFor(element, 'transform');
  }

  function transitionFor(element: HTMLElement, propertyName: string): TransitionEvent {
    return {
      target: element,
      currentTarget: element,
      propertyName,
    } as unknown as TransitionEvent;
  }
});
