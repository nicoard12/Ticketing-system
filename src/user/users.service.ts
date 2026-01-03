import { Model } from 'mongoose';
import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { Rol, User } from '../interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { MAIN_ADMIN_EMAIL } from './users.constants';


@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_MODEL')
    private userModel: Model<User>,
  ) {}

  async create(createUsuarioDto: CreateUserDto): Promise<User> {
    let rol: string;
    if (createUsuarioDto.email == MAIN_ADMIN_EMAIL) rol = Rol.ADMIN;
    else rol = Rol.NORMAL;
    const createdUser = new this.userModel({
      ...createUsuarioDto,
      rol,
    });
    return createdUser.save();
  }

  async find(idAuth: string): Promise<User | null> {
    const user = await this.userModel.findOne({ idAuth }).exec();
    return user ?? null;
  }

  async findByEmail(email: string): Promise<User | null>{
    const user = await this.userModel.findOne({ email }).exec();
    return user ?? null;
  }

  async getAllUsers(AuthId: string): Promise<User[]> {
    try {
      const user = await this.find(AuthId);

      if (user?.rol != Rol.ADMIN)
        throw new BadRequestException(
          `No tenés permiso para ver todos los usuarios.`,
        );

      const users = await this.userModel.find().exec();
      return users;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error obteniendo los usuarios',
      );
    }
  }

  async changeRole(
    authId: string,
    dto: ChangeRoleDto,
    userId: string,
  ): Promise<User> {
    const userAdmin = await this.find(authId);
    if (userAdmin?.rol !== Rol.ADMIN) {
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

    user.set({ rol: dto.rol });
    await user.save();

    return user;
  }
}
