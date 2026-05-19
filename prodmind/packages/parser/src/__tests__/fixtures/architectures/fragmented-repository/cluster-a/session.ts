import { login } from './auth';
import type { Credentials } from './auth';

export class SessionManager {
  private token: string | null = null;

  authenticate(creds: Credentials): void {
    this.token = login(creds);
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }
}
