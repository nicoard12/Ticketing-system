import { Document } from 'mongoose';
import { Rol } from 'src/usuarios/entities/usuario.entity';

export interface Usuario extends Document {
  readonly idAuth: string;
  readonly nombre: string;
  readonly email: string;
  readonly rol: Rol;
}