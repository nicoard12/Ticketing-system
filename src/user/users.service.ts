import { Model } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
import { User } from '../interfaces/user.interface';
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
    const user = await this.userModel
      .findOne({ idAuth })
      .exec();
    return user ?? null;
  }
}
