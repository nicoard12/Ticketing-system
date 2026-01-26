import { Module } from '@nestjs/common';
import { TicketMongoRepository } from './tickets.mongo.repository';
import { DatabaseModule } from 'src/database/database.module';
import { Connection } from 'mongoose';
import { TicketSchema } from 'src/schemas/ticket.schema';
import { UserSchema } from 'src/schemas/user.schema';
import { UserMongoRepository } from './user.mongo.repository';

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
  ],
  exports: ['TICKET_REPOSITORY', 'USER_REPOSITORY'],
})
export class RepositoriesModule {}
