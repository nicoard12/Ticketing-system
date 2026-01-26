import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/user/users.module';
import { EventsModule } from 'src/events/events.module';
import { ticketsProviders } from './tickets.providers';
import { PaymentModule } from 'src/payments/payments.module';
import { TicketsGateway } from './tickets.gateway';
import { TicketCleanupService } from './tickets.cleanup-service';
import { TicketMongoRepository } from './tickets.mongo.repository';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [DatabaseModule, UsersModule, EventsModule, PaymentModule, EmailModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway, TicketCleanupService, TicketMongoRepository, ...ticketsProviders],
})
export class TicketsModule {}
