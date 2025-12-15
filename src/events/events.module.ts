import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { eventsProviders } from './events.providers';
import { DatabaseModule } from '../database/database.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsersModule } from 'src/user/users.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule, UsersModule],
  controllers: [EventsController],
  providers: [EventsService, ...eventsProviders],
})
export class EventsModule {}
