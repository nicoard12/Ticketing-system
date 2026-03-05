import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { UsersModule } from 'src/user/users.module';
import { EventsModule } from 'src/events/events.module';
import { PaymentModule } from 'src/payments/payments.module';
import { TicketsGateway } from './tickets.gateway';
import { TicketCleanupService } from './tickets.cleanup-service';
import { EmailModule } from 'src/email/email.module';
import { DatabaseModule } from 'src/database/database.module';
import { Connection } from 'mongoose';
import { TicketMongoRepository } from './tickets.mongo.repository';
import { TicketSchema } from './ticket.schema';

@Module({
  imports: [DatabaseModule, UsersModule, EventsModule, PaymentModule, EmailModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsGateway,
    TicketCleanupService,
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
  ],
  exports: ['TICKET_REPOSITORY']
})
export class TicketsModule {}
