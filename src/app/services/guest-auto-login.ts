import { Service, inject } from '@angular/core';

import { AuthService } from './auth';

@Service()
export class GuestAutoLoginService {
  private readonly auth = inject(AuthService);

  async initialize(): Promise<void> {
    await this.auth.ready;

    if (this.auth.isAuthenticated() && (await this.auth.validateSession())) {
      return;
    }

    await this.auth.signInAnonymously();
  }
}
