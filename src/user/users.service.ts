import { Model } from 'mongoose';
import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Rol, User } from '../interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_MODEL')
    private userModel: Model<User>,
  ) {}

  async create(createUsuarioDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel({
      ...createUsuarioDto,
      rol: 'normal',
    });
    return createdUser.save();
  }

  async find(idAuth: string): Promise<User | null> {
    const user = await this.userModel.findOne({ idAuth }).exec();
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
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Error creando el evento',
      );
    }
  }
}
