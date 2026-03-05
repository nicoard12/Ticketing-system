import 'dotenv/config';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Event } from './interfaces/event.interface';
import { CloudinaryService } from '../file-storage/cloudinary.service';
import { parseFechas, toNumber } from './events.utils';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UsersService } from 'src/user/users.service';
import { Rol } from 'src/user/interfaces/user.interface';
import { ClientSession } from 'mongoose';
import { type IEventRepository } from 'src/events/interfaces/event-repository.interface';
import { type IFileStorage } from 'src/file-storage/file-storage.interaface';

@Injectable()
export class EventsService {
  constructor(
    @Inject('EVENT_REPOSITORY')
    private readonly repository: IEventRepository,
    @Inject('FILESTORAGE_PROVIDER')
    private readonly imageService: IFileStorage,
    private readonly usersService: UsersService,
  ) {}

  async create(
    createDto: CreateEventDto,
    AuthId: string,
    file?: Express.Multer.File,
  ): Promise<Event> {
    try {
      const user = await this.usersService.find(AuthId);

      if (user?.rol != Rol.PRODUCTOR)
        throw new BadRequestException(`No tenés permiso para crear eventos.`);

      // -------- Fechas y números --------
      const fechasConTickets = parseFechas(createDto.fechas);

      const precioEntrada = toNumber(createDto.precioEntrada, 0);

      //Verificar titulo repetido
      const exists = await this.repository.findByTitle(createDto.titulo);
      if (exists) {
        throw new BadRequestException(
          `Ya existe un evento con el título "${createDto.titulo}"`,
        );
      }

      // La imagen se sube una vez que se verificó nombre duplicado de evento, para evitar ocupar espacio innecesario en la nube
      let imagenUrl: string;
      if (file) {
        imagenUrl = await this.imageService.uploadImage(file);
      }

      const createdEvent = await this.repository.create(
        {
          ...createDto,
          precioEntrada,
          createdBy: AuthId,
        },
        fechasConTickets,
        imagenUrl!,
      );

      return createdEvent;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error creando el evento',
      );
    }
  }

  async findAll(): Promise<Event[]> {
    return await this.repository.findAll();
  }

  async findById(id: string): Promise<Event> {
    try {
      const event = await this.repository.findById(id);
      if (!event)
        throw new NotFoundException(`Evento con id ${id} no encontrado`);
      return event;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error creando el evento',
      );
    }
  }

  async update(
    id: string,
    updateDto: UpdateEventDto,
    authId: string,
    file?: Express.Multer.File,
  ): Promise<Event> {
    try {
      const user = await this.usersService.find(authId);
      if (user?.rol !== Rol.PRODUCTOR)
        throw new ForbiddenException(
          'No tenés permiso para modificar este evento.',
        );

      const event = await this.findById(id);
      if (event.createdBy !== authId)
        throw new ForbiddenException(
          'No tenés permiso para modificar este evento.',
        );

      // -------- Fechas y números --------
      const fechasConTickets = parseFechas(updateDto.fechas!);

      const precioEntrada = toNumber(
        updateDto.precioEntrada,
        event.precioEntrada,
      );

      //Verificar titulo repetido
      if (updateDto.titulo && updateDto.titulo !== event.titulo) {
        const existente = await this.repository.findByTitle(updateDto.titulo);
        if (existente) {
          throw new BadRequestException('Ya existe un evento con ese título');
        }
      }

      // Subir nueva imagen, borrar la anterior
      let imagenUrl = event.imagenUrl;
      if (file) {
        const nuevaImagen = await this.imageService.uploadImage(file);
        if (imagenUrl) {
          await this.imageService.deleteImage(imagenUrl);
        }
        imagenUrl = nuevaImagen;
      }

      return await this.repository.updateEvent(
        event,
        updateDto,
        fechasConTickets,
        precioEntrada,
        imagenUrl,
      );
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error editando el evento',
      );
    }
  }

  async remove(id: string, authId: string): Promise<Event> {
    const user = await this.usersService.find(authId);
    if (user?.rol !== Rol.PRODUCTOR) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar este evento.',
      );
    }

    const event = await this.findById(id);
    if (event.createdBy !== authId) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar este evento.',
      );
    }

    // Borrar imagen
    if (event.imagenUrl) {
      try {
        await this.imageService.deleteImage(event.imagenUrl);
      } catch (error) {
        throw new BadRequestException('Error al eliminar la imagen del evento');
      }
    }

    // Borrar evento
    const deletedEvent = await this.repository.deleteEvent(id);

    return deletedEvent!;
  }

  async restarEntradas(
    eventId: string,
    eventDateId: string,
    quantity: number,
    session: ClientSession,
  ): Promise<Event> {
    const event = await this.repository.findUnaFecha(
      eventId,
      eventDateId,
      session,
    );

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    const fecha = event.fechas.find(
      (f) => f._id!.toString() === eventDateId.toString(),
    );

    if (!fecha) {
      throw new NotFoundException('Fecha no encontrada');
    }

    const now = new Date();

    if (fecha.fecha < now) {
      throw new BadRequestException('La fecha del evento ya pasó');
    }

    // Update atómico
    const updatedEvent = await this.repository.decrementTicketsForEventDate(
      eventId,
      eventDateId,
      quantity,
      session,
    );

    if (!updatedEvent) {
      throw new BadRequestException('No hay entradas suficientes');
    }

    return updatedEvent;
  }

  async sumarEntradas(
    eventId: string,
    eventDateId: string,
    quantity: number,
    session: ClientSession,
  ): Promise<Event> {
    const event = await this.repository.findUnaFecha(
      eventId,
      eventDateId,
      session,
    );

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    const fecha = event.fechas.find(
      (f) => f._id!.toString() === eventDateId.toString(),
    );

    if (!fecha) {
      throw new NotFoundException('Fecha no encontrada');
    }

    const now = new Date();

    if (fecha.fecha < now) {
      throw new BadRequestException('La fecha del evento ya pasó');
    }

    const updatedEvent = await this.repository.incrementTicketsForEventDate(
      eventId,
      eventDateId,
      quantity,
      session,
    );
    return updatedEvent!;
  }
}
