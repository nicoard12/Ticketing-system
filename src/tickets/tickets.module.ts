import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/user/users.module';
import { EventsModule } from 'src/events/events.module';
import { ticketsProviders } from './tickets.providers';
import { MercadopagoModule } from 'src/mercadopago/mercadopago.module';
import { TicketsGateway } from './tickets.gateway';

@Module({
  imports: [DatabaseModule, UsersModule, EventsModule, MercadopagoModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway, ...ticketsProviders],
})
export class TicketsModule {}
