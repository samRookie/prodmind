import { UserService } from '../services/user-service';
import type { CreateUserDto } from '../services/user-service';

const userService = new UserService();

export function handleCreateUser(body: CreateUserDto) {
  const user = userService.createUser(body);
  return { status: 201, data: { id: user.id, name: user.name, email: user.email } };
}

export function handleGetUser(id: string) {
  const user = userService.getUser(id);
  if (!user) return { status: 404, error: 'User not found' };
  return { status: 200, data: user };
}
