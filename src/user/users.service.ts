import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Rol, User } from 'src/user/interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { MAIN_ADMIN_EMAIL } from './users.constants';
import { type IUserRepository } from 'src/user/interfaces/user-repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: IUserRepository,
  ) {}

  async create(createUsuarioDto: CreateUserDto): Promise<User> {
    const rol =
      createUsuarioDto.email === MAIN_ADMIN_EMAIL ? Rol.ADMIN : Rol.NORMAL;

    return this.userRepository.create({
      ...createUsuarioDto,
      rol,
    });
  }

  async find(idAuth: string): Promise<User | null> {
    return this.userRepository.findByAuthId(idAuth);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async getAllUsers(authId: string): Promise<User[]> {
    const user = await this.find(authId);

    if (user?.rol !== Rol.ADMIN) {
      throw new BadRequestException(
        'No tenés permiso para ver todos los usuarios.',
      );
    }

    return this.userRepository.findAll();
  }

  async changeRole(
    authId: string,
    dto: ChangeRoleDto,
    userId: string,
  ): Promise<User> {
    const admin = await this.find(authId);
    if (admin?.rol !== Rol.ADMIN) {
      throw new BadRequestException(
        'No tenés permiso para modificar los roles',
      );
    }

    const user = await this.find(userId);
    if (!user) {
      throw new BadRequestException('El usuario no existe');
    }

    if (user.email === MAIN_ADMIN_EMAIL) {
      throw new BadRequestException(
        'No podés modificar el rol del admin principal',
      );
    }

    return this.userRepository.updateRole(user, dto.rol);
  }
}
