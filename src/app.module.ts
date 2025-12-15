import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { UsersModule } from './user/users.module';
import { AuthzModule } from './authz/authz.module';

@Module({
  imports: [EventsModule, UsersModule, AuthzModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
