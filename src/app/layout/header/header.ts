import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly contacts = inject(ContactService);
  private readonly tasks = inject(TaskService);

  readonly heading = input('Kanban Project Management Tool');
  readonly initials = this.auth.initials;

  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  async logout(): Promise<void> {
    this.closeMenu();

    const signedOut = await this.auth.signOut();

    if (!signedOut) {
      return;
    }

    this.tasks.clearState();
    this.contacts.clearState();
    await this.router.navigate(['/login']);
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
