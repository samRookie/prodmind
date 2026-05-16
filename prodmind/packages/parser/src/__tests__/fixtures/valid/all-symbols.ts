export interface User {
  id: number;
  name: string;
}

export class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export type Callback<T> = (value: T) => void;

const internalVar = 42;

export { internalVar as exportedVar };
