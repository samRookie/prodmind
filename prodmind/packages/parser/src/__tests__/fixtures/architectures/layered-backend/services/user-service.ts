import { UserRepository } from '../repositories/user-repository';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

const repo = new UserRepository();

export class UserService {
  createUser(dto: CreateUserDto): User {
    const existing = repo.findByEmail(dto.email);
    if (existing) throw new Error('Email already exists');
    return repo.create(dto);
  }

  getUser(id: string): User | null {
    return repo.findById(id);
  }

  listUsers(): User[] {
    return repo.findAll();
  }
}
