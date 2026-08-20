import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);

  readonly heading = input('Kanban Project Management Tool');
  readonly initials = input('SM');

  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    if (this.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }
}
