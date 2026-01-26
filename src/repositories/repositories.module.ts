import { Module } from '@nestjs/common';
import { TicketMongoRepository } from './tickets.mongo.repository';
import { DatabaseModule } from 'src/database/database.module';
import { Connection } from 'mongoose';
import { TicketSchema } from 'src/schemas/ticket.schema';
import { UserSchema } from 'src/schemas/user.schema';
import { UserMongoRepository } from './user.mongo.repository';
import { EventSchema } from 'src/schemas/event.schema';
import { EventsMongoRepository } from './events.mongo.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: 'TICKET_MODEL',
      useFactory: (connection: Connection) =>
        connection.model('Ticket', TicketSchema),
      inject: ['DATABASE_CONNECTION'],
    },
    {
      provide: 'TICKET_REPOSITORY',
      useClass: TicketMongoRepository,
    },
    {
      provide: 'USER_MODEL',
      useFactory: (connection: Connection) =>
        connection.model('User', UserSchema),
      inject: ['DATABASE_CONNECTION'],
    },
    {
      provide: 'USER_REPOSITORY',
      useClass: UserMongoRepository,
    },
    {
      provide: 'EVENT_MODEL',
      useFactory: (connection: Connection) =>
        connection.model('Event', EventSchema),
      inject: ['DATABASE_CONNECTION'],
    },
    {
      provide: 'EVENT_REPOSITORY',
      useClass: EventsMongoRepository,
    },
  ],
  exports: ['TICKET_REPOSITORY', 'USER_REPOSITORY', 'EVENT_REPOSITORY'],
})
export class RepositoriesModule {}
