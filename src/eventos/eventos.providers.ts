import { Connection } from 'mongoose';
import { EventoSchema } from '../schemas/evento.schema';

export const eventosProviders = [
  {
    provide: 'EVENTO_MODEL',
    useFactory: (connection: Connection) => connection.model('Evento', EventoSchema),
    inject: ['DATABASE_CONNECTION'],
  },
];
