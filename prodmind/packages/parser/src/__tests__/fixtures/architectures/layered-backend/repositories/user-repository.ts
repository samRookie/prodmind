export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
}

const users: UserRecord[] = [];

export class UserRepository {
  create(dto: { name: string; email: string; password: string }): UserRecord {
    const user = { id: crypto.randomUUID(), ...dto };
    users.push(user);
    return user;
  }

  findById(id: string): UserRecord | null {
    return users.find((u) => u.id === id) ?? null;
  }

  findByEmail(email: string): UserRecord | null {
    return users.find((u) => u.email === email) ?? null;
  }

  findAll(): UserRecord[] {
    return [...users];
  }
}
