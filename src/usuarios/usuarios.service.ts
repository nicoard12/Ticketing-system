import { Model } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
import { Usuario } from '../interfaces/usuario.interface';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @Inject('USUARIO_MODEL')
    private usuarioModel: Model<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const createdUsuario = new this.usuarioModel({
      ...createUsuarioDto,
      rol: 'normal',
    });
    return createdUsuario.save();
  }

  async find(idAuth: string): Promise<Usuario | null> {
    const usuario = await this.usuarioModel
      .findOne({ idAuth })
      .exec();
    return usuario ?? null;
  }
}
