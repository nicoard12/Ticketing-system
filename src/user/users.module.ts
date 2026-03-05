import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from 'src/database/database.module';
import { Connection } from 'mongoose';
import { UserSchema } from './user.schema';
import { UserMongoRepository } from './user.mongo.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: 'USER_MODEL',
      useFactory: (connection: Connection) =>
        connection.model('User', UserSchema),
      inject: ['DATABASE_CONNECTION'],
    },
    {
      provide: 'USER_REPOSITORY',
      useClass: UserMongoRepository,
    },
  ],
  exports: [UsersService, 'USER_REPOSITORY']
})
export class UsersModule {}
