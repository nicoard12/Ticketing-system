import { Model } from 'mongoose';
import 'dotenv/config';
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
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

      if (user!.rol != Rol.PRODUCTOR)
        throw new BadRequestException(`No tenés permiso para crear eventos.`);

      const fechasConTickets = parseFechas(createDto.fechas);

      const precioEntrada = toNumber(createDto.precioEntrada, 0);


      //Verificar duplicado antes de subir imagen
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
        try {
          const imagenUrl = await this.cloudinaryService.uploadImage(file);
          createdEvent.set('imagenUrl', imagenUrl);
        } catch (error: any) {
          console.error('Error subiendo la imagen:', error.message);
        }
      }

      await createdEvent.save();

      return createdEvent;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Error creando el evento',
      );
    }
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find().exec();
  }

  async findOne(id: string): Promise<Event> {
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
    const user = await this.usersService.find(authId);
    if (user!.rol !== Rol.PRODUCTOR)
      throw new ForbiddenException(
        'No tenés permiso para modificar este evento.',
      );

    const event = await this.findOne(id);
    if (event.createdBy !== authId)
      throw new ForbiddenException(
        'No tenés permiso para modificar este evento.',
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
      try {
        const nuevaImagen = await this.cloudinaryService.uploadImage(file);

        if (imagenUrl) {
          await this.cloudinaryService.deleteImage(imagenUrl);
        }

        imagenUrl = nuevaImagen;
      } catch (error) {
        throw new BadRequestException('Error al subir la imagen del evento');
      }
    }

    // -------- Fechas y números --------
    const fechasConTickets = parseFechas(updateDto.fechas!)

    const precioEntrada = toNumber(
      updateDto.precioEntrada,
      event.precioEntrada,
    );


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
  }

  async remove(id: string, authId: string): Promise<Event> {
    const user = await this.usersService.find(authId);
    if (user!.rol !== Rol.PRODUCTOR) {
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
}
