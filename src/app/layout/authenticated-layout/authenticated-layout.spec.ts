import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../services/auth';
import { ContactService } from '../../services/contact';
import { TaskService } from '../../services/task';
import { AuthenticatedLayout } from './authenticated-layout';

describe('AuthenticatedLayout', () => {
  let component: AuthenticatedLayout;
  let fixture: ComponentFixture<AuthenticatedLayout>;

  const authService = {
    initials: signal('TU'),
    signOut: vi.fn(),
  } as unknown as AuthService;

  const contactService = {
    clearState: vi.fn(),
  } as unknown as ContactService;

  const taskService = {
    clearState: vi.fn(),
  } as unknown as TaskService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ContactService, useValue: contactService },
        { provide: TaskService, useValue: taskService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthenticatedLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the authenticated navigation and content outlet', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-sidebar')).toBeTruthy();
    expect(element.querySelector('app-header')).toBeTruthy();
    expect(element.querySelector('router-outlet')).toBeTruthy();
  });
});
