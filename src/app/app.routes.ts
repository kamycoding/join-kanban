import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { guestOnlyGuard } from './guards/guest-only.guard';

/**
 * Two groups: the standalone entry pages, and everything that renders inside
 * the app shell with the sidebar and the top bar.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./pages/login/login').then((module) => module.Login),
  },
  {
    path: 'sign-up',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./pages/sign-up/sign-up').then((module) => module.SignUp),
  },
  {
    path: 'legal-notice',
    loadComponent: () =>
      import('./pages/legal-notice/legal-notice').then((module) => module.LegalNotice),
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy').then((module) => module.PrivacyPolicy),
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell/app-shell').then((module) => module.AppShell),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'summary',
        pathMatch: 'full',
      },
      {
        path: 'summary',
        loadComponent: () => import('./pages/summary/summary').then((module) => module.Summary),
      },
      {
        path: 'add-task',
        loadComponent: () => import('./pages/add-task/add-task').then((module) => module.AddTask),
      },
      {
        path: 'board',
        loadComponent: () => import('./pages/board/board').then((module) => module.Board),
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./features/contacts/contacts').then((module) => module.Contacts),
      },
      {
        path: 'help',
        loadComponent: () => import('./pages/help/help').then((module) => module.Help),
      },
    ],
  },
];
