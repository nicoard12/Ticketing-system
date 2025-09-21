import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventosModule } from './eventos/eventos.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [EventosModule, UsuariosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
