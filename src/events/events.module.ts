import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { eventsProviders } from './events.providers';
import { DatabaseModule } from '../database/database.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsersModule } from 'src/user/users.module';
import { EventsMongoRepository } from './events.mongo.repository';

@Module({
  imports: [DatabaseModule, CloudinaryModule, UsersModule],
  controllers: [EventsController],
  providers: [EventsService, EventsMongoRepository, ...eventsProviders],
  exports: [EventsService]
})
export class EventsModule {}
