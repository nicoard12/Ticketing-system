import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from 'src/user/users.module';
import { FileStorageModule } from 'src/file-storage/file-storage.module';
import { DatabaseModule } from 'src/database/database.module';
import { Connection } from 'mongoose';
import { EventSchema } from './event.schema';
import { EventsMongoRepository } from './events.mongo.repository';

@Module({
  imports: [FileStorageModule, UsersModule, DatabaseModule],
  controllers: [EventsController],
  providers: [
    EventsService,
    {
      provide: 'EVENT_MODEL',
      useFactory: (connection: Connection) =>
        connection.model('Event', EventSchema),
      inject: ['DATABASE_CONNECTION'],
    },
    {
      provide: 'EVENT_REPOSITORY',
      useClass: EventsMongoRepository,
    },
  ],
  exports: [EventsService, 'EVENT_REPOSITORY'],
})
export class EventsModule {}
