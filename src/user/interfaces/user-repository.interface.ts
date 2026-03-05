import { User } from './user.interface';

export interface IUserRepository {
  create(data: Partial<User>): Promise<User>;

  findByAuthId(idAuth: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findAll(): Promise<User[]>;

  updateRole(user: User, rol: string): Promise<User>;
}
