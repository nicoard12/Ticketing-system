import { Document } from 'mongoose';

export enum Rol {
  PRODUCTOR = 'productor',
  NORMAL = 'normal',
  STAFF = 'staff',
}

export interface Usuario extends Document {
  readonly idAuth: string;
  readonly nombre: string;
  readonly email: string;
  readonly rol: Rol;
}