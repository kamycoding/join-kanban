import { Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline';
export type ButtonSize = 'default' | 'large' | 'action';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('default');
  readonly type = input<ButtonType>('button');
  readonly disabled = input(false);
  readonly iconSrc = input<string | null>(null);
  readonly fullWidth = input(false);
}
