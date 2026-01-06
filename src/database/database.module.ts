import { Module } from '@nestjs/common';
import { databaseProviders } from './database.providers';
import { TransactionManager } from './database-transaction.manager';

@Module({
  providers: [...databaseProviders, TransactionManager],
  exports: [...databaseProviders, TransactionManager],
})
export class DatabaseModule {}
