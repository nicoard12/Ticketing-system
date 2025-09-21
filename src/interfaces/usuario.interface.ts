import { Document } from 'mongoose';
import { Rol } from 'src/usuarios/entities/usuario.entity';

export interface Usuario extends Document {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password: string;
  readonly rol: Rol;
}