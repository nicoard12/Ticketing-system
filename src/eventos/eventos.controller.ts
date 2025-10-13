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
} from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('eventos')
@UsePipes(new ValidationPipe())
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post()
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  create(
    @Body() createEventoDto: CreateEventoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    return this.eventosService.create(createEventoDto, file);
  }

  @Get()
  findAll() {
    return this.eventosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventosService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  update(
    @Param('id') id: string,
    @Body() updateEventoDto: UpdateEventoDto,
    @UploadedFile() file?: Express.Multer.File, // archivo opcional
  ) {
    return this.eventosService.update(id, updateEventoDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventosService.remove(id);
  }
}
