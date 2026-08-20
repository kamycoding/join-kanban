import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { Sidebar } from './layout/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('join-project');
}
