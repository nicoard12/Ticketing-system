import { Model } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
import { Usuario } from '../interfaces/usuario.interface';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @Inject('USUARIO_MODEL')
    private usuarioModel: Model<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const createdEvento = new this.usuarioModel(createUsuarioDto);
    return createdEvento.save();
  }

  async find(user: CreateUsuarioDto): Promise<Usuario | null> {
    const usuario = await this.usuarioModel
      .findOne({ idAuth: user.idAuth })
      .exec();
    return usuario ?? null;
  }
}
