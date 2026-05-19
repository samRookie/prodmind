export interface Credentials {
  username: string;
  password: string;
}

export function login(creds: Credentials): string {
  return `token-${creds.username}`;
}

export function logout(token: string): void {
  console.log(`Invalidated: ${token}`);
}
