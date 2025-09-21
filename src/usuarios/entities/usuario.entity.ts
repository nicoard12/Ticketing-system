export enum Rol {
  PRODUCTOR = 'productor',
  NORMAL = 'normal',
  STAFF = 'staff',
}

export class Usuario {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: Rol;
}
