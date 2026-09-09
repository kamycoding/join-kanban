import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

/**
 * Chrome around the signed-in pages. Login and sign-up sit outside it, so they
 * render on their own without the sidebar and the top bar.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {}
