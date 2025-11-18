import {
  Controller,
  Get,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Controller('usuarios')
@UsePipes(new ValidationPipe())
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  async create(@Body() createUsuarioDto: CreateUsuarioDto) {
    const usuario = await this.usuariosService.find(createUsuarioDto);
    if (usuario) return usuario;
    return this.usuariosService.create(createUsuarioDto);
  }
}
