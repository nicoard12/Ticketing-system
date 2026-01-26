import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsersModule } from 'src/user/users.module';
import { RepositoriesModule } from 'src/repositories/repositories.module';

@Module({
  imports: [CloudinaryModule, UsersModule, RepositoriesModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
