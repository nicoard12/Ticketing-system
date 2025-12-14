import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Put,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('events')
@UsePipes(new ValidationPipe())
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  create(
    @Req() req,
    @Body() createEventoDto: CreateEventoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    return this.eventosService.create(createEventoDto, req.user.sub, file);
  }

  @Get()
  findAll() {
    return this.eventosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventosService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  update(
    @Param('id') id: string,
    @Body() updateEventoDto: UpdateEventoDto,
    @Req() req,
    @UploadedFile() file?: Express.Multer.File, // archivo opcional
  ) {
    const AuthId = req.user.sub;

    return this.eventosService.update(id, updateEventoDto, AuthId, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const AuthId = req.user.sub;
    return this.eventosService.remove(id, AuthId);
  }
}
