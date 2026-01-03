import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { UsersModule } from './user/users.module';
import { AuthzModule } from './authz/authz.module';
import { TicketsModule } from './tickets/tickets.module';
import { MercadopagoModule } from './mercadopago/mercadopago.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [EventsModule, UsersModule, AuthzModule, TicketsModule, MercadopagoModule, ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
