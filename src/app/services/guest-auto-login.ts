import { Service, inject } from '@angular/core';

import { AuthService } from './auth';

const GUEST_AUTH_CONFIG_URL = '/guest-auth.local.json';

interface GuestAuthConfig {
  password?: unknown;
}

@Service()
export class GuestAutoLoginService {
  private readonly auth = inject(AuthService);

  async initialize(): Promise<void> {
    await this.auth.ready;

    if (this.auth.isAuthenticated()) {
      return;
    }

    const password = await this.loadPassword();

    if (password) {
      await this.auth.signInAsGuest(password);
    }
  }

  private async loadPassword(): Promise<string | null> {
    try {
      const response = await fetch(GUEST_AUTH_CONFIG_URL, { cache: 'no-store' });

      if (!response.ok) {
        return null;
      }

      const config = (await response.json()) as GuestAuthConfig;
      return typeof config.password === 'string' && config.password.length > 0
        ? config.password
        : null;
    } catch {
      return null;
    }
  }
}
