import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'summary',
    pathMatch: 'full',
  },
  {
    path: 'summary',
    loadComponent: () =>
      import('./pages/summary/summary').then((module) => module.Summary),
  },
  {
    path: 'add-task',
    loadComponent: () =>
      import('./pages/add-task/add-task').then((module) => module.AddTask),
  },
  {
    path: 'board',
    loadComponent: () =>
      import('./pages/board/board').then((module) => module.Board),
  },
  {
    path: 'contacts',
    loadComponent: () =>
      import('./features/contacts/contacts').then((module) => module.Contacts),
  },
];
