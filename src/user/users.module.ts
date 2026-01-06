import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { usersProviders } from './users.providers';
import { DatabaseModule } from '../database/database.module';
import { UserMongoRepository } from './user.mongo.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UserMongoRepository, ...usersProviders],
  exports: [UsersService]
})
export class UsersModule {}
