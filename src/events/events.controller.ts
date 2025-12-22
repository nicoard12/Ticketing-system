import {
  Controller,
  Get,
  Post,
  Body,
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
  Patch,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('events')
@UsePipes(new ValidationPipe())
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  create(
    @Req() req,
    @Body() createEventDto: CreateEventDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    return this.eventsService.create(createEventDto, req.user.sub, file);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Req() req,
    @UploadedFile() file?: Express.Multer.File, // archivo opcional
  ) {
    const AuthId = req.user.sub;

    return this.eventsService.update(id, updateEventDto, AuthId, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const AuthId = req.user.sub;
    return this.eventsService.remove(id, AuthId);
  }
}
