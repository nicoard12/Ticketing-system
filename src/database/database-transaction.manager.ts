import { Inject, Injectable } from '@nestjs/common';
import mongoose, { ClientSession } from 'mongoose';

@Injectable()
export class TransactionManager {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly connection: typeof mongoose,
  ) {}

  async runInTransaction<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
