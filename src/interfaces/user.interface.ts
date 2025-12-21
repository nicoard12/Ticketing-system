import { Document } from 'mongoose';

export enum Rol {
  PRODUCTOR = 'productor',
  NORMAL = 'normal',
  STAFF = 'staff',
  ADMIN= "admin"
}

export interface User extends Document {
  readonly idAuth: string;
  readonly nombre: string;
  readonly email: string;
  readonly imagen: string;
  readonly rol: Rol;
}