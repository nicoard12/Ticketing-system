import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { eventosProviders } from './eventos.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EventosController],
  providers: [EventosService, ...eventosProviders],
})
export class EventosModule {}
