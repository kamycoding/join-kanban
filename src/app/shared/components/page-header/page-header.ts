import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  imports: [],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  private readonly location = inject(Location);

  readonly heading = input.required<string>();

  goBack(): void {
    this.location.back();
  }
}
