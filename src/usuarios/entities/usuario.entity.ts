export enum Rol {
  PRODUCTOR = 'productor',
  NORMAL = 'normal',
  STAFF = 'staff',
}

export class Usuario {
  idAuth: string;
  nombre: string;
  email: string;
  rol: Rol;
}
