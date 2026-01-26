import { Module } from '@nestjs/common';
import { TicketMongoRepository } from './tickets.mongo.repository';
import { DatabaseModule } from 'src/database/database.module';
import { Connection } from 'mongoose';
import { TicketSchema } from 'src/schemas/ticket.schema';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: 'TICKET_MODEL',
      useFactory: (connection: Connection) => connection.model('Ticket', TicketSchema),
      inject: ['DATABASE_CONNECTION'],
    },
    {
      provide: 'TICKET_REPOSITORY',
      useClass: TicketMongoRepository,
    },
  ],
  exports: ['TICKET_REPOSITORY'],
})
export class RepositoriesModule {}
