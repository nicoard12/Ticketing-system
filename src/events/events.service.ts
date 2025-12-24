import { ClientSession, Model, Types } from 'mongoose';
import 'dotenv/config';
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { Event } from '../interfaces/event.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { parseFechas, toNumber } from './events.utils';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UsersService } from 'src/user/users.service';
import { Rol } from 'src/interfaces/user.interface';

@Injectable()
export class EventsService {
  constructor(
    @Inject('EVENT_MODEL') private eventModel: Model<Event>,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
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
      const exists = await this.eventModel.findOne({
        titulo: createDto.titulo,
      });
      if (exists) {
        throw new BadRequestException(
          `Ya existe un evento con el título "${createDto.titulo}"`,
        );
      }

      const createdEvent = new this.eventModel({
        ...createDto,
        fechas: fechasConTickets,
        precioEntrada,
        createdBy: AuthId,
      });

      // La imagen se sube una vez que se verificó nombre duplicado de evento, para evitar ocupar espacio innecesario en la nube
      if (file) {
        const imagenUrl = await this.cloudinaryService.uploadImage(file);
        createdEvent.set('imagenUrl', imagenUrl);
      }

      await createdEvent.save();

      return createdEvent;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error creando el evento',
      );
    }
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find().exec();
  }

  async findOne(id: string): Promise<Event> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }

    const event = await this.eventModel.findById(id).exec();
    if (!event)
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    return event;
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

      const event = await this.findOne(id);
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
        const existente = await this.eventModel.findOne({
          titulo: updateDto.titulo,
        });
        if (existente) {
          throw new BadRequestException('Ya existe un evento con ese título');
        }
      }

      // Subir nueva imagen, borrar la anterior
      let imagenUrl = event.imagenUrl;
      if (file) {
        const nuevaImagen = await this.cloudinaryService.uploadImage(file);
        if (imagenUrl) {
          await this.cloudinaryService.deleteImage(imagenUrl);
        }
        imagenUrl = nuevaImagen;
      }

      // Update
      event.set({
        titulo: updateDto.titulo ?? event.titulo,
        descripcion: updateDto.descripcion ?? event.descripcion,
        ubicacion: updateDto.ubicacion ?? event.ubicacion,
        fechas: fechasConTickets,
        precioEntrada,
        imagenUrl,
      });

      await event.save();

      return event;
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

    const event = await this.findOne(id);
    if (event.createdBy !== authId) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar este evento.',
      );
    }

    // Borrar imagen
    if (event.imagenUrl) {
      try {
        await this.cloudinaryService.deleteImage(event.imagenUrl);
      } catch (error) {
        throw new BadRequestException('Error al eliminar la imagen del evento');
      }
    }

    // Borrar evento
    const deletedEvent = await this.eventModel.findByIdAndDelete(id).exec();

    return deletedEvent!;
  }

  async restarEntradas(
    eventId: string,
    eventDateId: string,
    quantity: number,
    session: ClientSession,
  ): Promise<Event> {
    const event = await this.eventModel
      .findOne(
        {
          _id: eventId,
          'fechas._id': eventDateId,
        },
        { fechas: 1 },
      )
      .session(session);

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    const fecha = event.fechas.find((f) => f._id!.toString() === eventDateId);

    if (!fecha) {
      throw new NotFoundException('Fecha no encontrada');
    }

    const now = new Date();

    if (fecha.fecha < now) {
      throw new BadRequestException('La fecha del evento ya pasó');
    }

    if (fecha.cantidadEntradas < quantity) {
      throw new BadRequestException('No hay entradas suficientes');
    }

    // Update atómico
    const updatedEvent = await this.eventModel.findOneAndUpdate(
      {
        _id: eventId,
        'fechas._id': eventDateId,
      },
      {
        $inc: { 'fechas.$.cantidadEntradas': -quantity },
      },
      { new: true, session },
    );

    if (!updatedEvent) {
      throw new BadRequestException('No se pudieron restar las entradas');
    }

    return updatedEvent;
  }
}
