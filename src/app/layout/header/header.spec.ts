import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';

import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  const signOut = vi.fn();
  const clearContacts = vi.fn();
  const clearTasks = vi.fn();
  const userInitials = signal('SM');

  const authService = {
    signOut,
    initials: userInitials,
  } as unknown as AuthService;

  const contactService = {
    clearState: clearContacts,
  } as unknown as ContactService;

  const taskService = {
    clearState: clearTasks,
  } as unknown as TaskService;

  beforeEach(async () => {
    signOut.mockReset();
    clearContacts.mockReset();
    userInitials.set('SM');
    clearTasks.mockReset();
    signOut.mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ContactService, useValue: contactService },
        { provide: TaskService, useValue: taskService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('signs out, clears user data and navigates to login', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.menuOpen.set(true);

    await component.logout();

    expect(component.menuOpen()).toBe(false);
    expect(signOut).toHaveBeenCalledOnce();
    expect(clearTasks).toHaveBeenCalledOnce();
    expect(clearContacts).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('keeps user data when sign-out fails', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    signOut.mockResolvedValue(false);

    await component.logout();

    expect(clearTasks).not.toHaveBeenCalled();
    expect(clearContacts).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the initials of the authenticated user', () => {
    userInitials.set('AB');
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.header__avatar') as HTMLButtonElement;

    expect(avatar.textContent?.trim()).toBe('AB');
  });

  it('should toggle the profile menu', () => {
    expect(component.menuOpen()).toBe(false);

    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    component.toggleMenu();
    expect(component.menuOpen()).toBe(false);
  });
});
