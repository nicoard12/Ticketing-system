import { Connection } from 'mongoose';
import { UsuarioSchema } from '../schemas/usuario.schema';

export const usuariosProviders = [
  {
    provide: 'USUARIO_MODEL',
    useFactory: (connection: Connection) => connection.model('Usuario', UsuarioSchema),
    inject: ['DATABASE_CONNECTION'],
  },
];
