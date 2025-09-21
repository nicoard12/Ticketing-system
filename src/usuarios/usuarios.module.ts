import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { usuariosProviders } from './usuarios.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, ...usuariosProviders],
})
export class UsuariosModule {}
