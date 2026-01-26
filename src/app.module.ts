import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { UsersModule } from './user/users.module';
import { AuthzModule } from './authz/authz.module';
import { TicketsModule } from './tickets/tickets.module';
import { PaymentModule } from './payments/payments.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from './email/email.module';

@Module({
  imports: [EventsModule, UsersModule, AuthzModule, TicketsModule, PaymentModule, ScheduleModule.forRoot(), EmailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
