import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from 'src/user/users.module';
import { RepositoriesModule } from 'src/repositories/repositories.module';
import { FileStorageModule } from 'src/file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule, UsersModule, RepositoriesModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
