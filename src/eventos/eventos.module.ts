import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { eventosProviders } from './eventos.providers';
import { DatabaseModule } from '../database/database.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule, UsuariosModule],
  controllers: [EventosController],
  providers: [EventosService, ...eventosProviders],
})
export class EventosModule {}
