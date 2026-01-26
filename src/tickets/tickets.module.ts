import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/user/users.module';
import { EventsModule } from 'src/events/events.module';
import { PaymentModule } from 'src/payments/payments.module';
import { TicketsGateway } from './tickets.gateway';
import { TicketCleanupService } from './tickets.cleanup-service';
import { EmailModule } from 'src/email/email.module';
import { RepositoriesModule } from 'src/repositories/repositories.module';

@Module({
  imports: [DatabaseModule, UsersModule, EventsModule, PaymentModule, EmailModule, RepositoriesModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway, TicketCleanupService],
})
export class TicketsModule {}
