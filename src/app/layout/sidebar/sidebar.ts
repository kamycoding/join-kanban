import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly links = [
    { path: '/summary', label: 'Summary', icon: 'icon-summary' },
    { path: '/add-task', label: 'Add Task', icon: 'icon-add-task' },
    { path: '/board', label: 'Board', icon: 'icon-board' },
    { path: '/contacts', label: 'Contacts', icon: 'icon-contacts' },
  ];

  readonly legalLinks = [
    { path: '/privacy-policy', label: 'Privacy Policy' },
    { path: '/legal-notice', label: 'Legal notice' },
  ];
}
