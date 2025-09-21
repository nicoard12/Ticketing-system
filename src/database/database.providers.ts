import * as mongoose from 'mongoose';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect('mongodb+srv://nicoarditi12:48595519@cluster0.b9wf0su.mongodb.net/'),
  },
];
