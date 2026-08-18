import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'contacts',
    loadComponent: () => import('./features/contacts/contacts').then((module) => module.Contacts),
  },
];
