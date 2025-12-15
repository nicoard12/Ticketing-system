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
import { Evento } from '../interfaces/evento.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { parseFechas, toNumber, buildFechasConTickets } from './eventos.utils';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { Rol } from 'src/interfaces/usuario.interface';

@Injectable()
export class EventosService {
  constructor(
    @Inject('EVENTO_MODEL') private eventoModel: Model<Evento>,
    private readonly usuariosService: UsuariosService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createDto: CreateEventoDto,
    AuthId: string,
    file?: Express.Multer.File,
  ): Promise<Evento> {
    try {
      const user = await this.usuariosService.find(AuthId);

      if (user!.rol != Rol.PRODUCTOR)
        throw new BadRequestException(`No tenés permiso para crear eventos.`);

      const fechas = parseFechas(createDto.fechas);
      const cantidadEntradas = toNumber(createDto.cantidadEntradas, 0);
      const precioEntrada = toNumber(createDto.precioEntrada, 0);

      const fechasConTickets = buildFechasConTickets(
        fechas,
        createDto.titulo,
        cantidadEntradas,
      );

      //Verificar duplicado antes de subir imagen
      const exists = await this.eventoModel.findOne({
        titulo: createDto.titulo,
      });
      if (exists) {
        throw new BadRequestException(
          `Ya existe un evento con el título "${createDto.titulo}"`,
        );
      }

      const createdEvento = new this.eventoModel({
        ...createDto,
        fechas: fechasConTickets,
        cantidadEntradas,
        precioEntrada,
        createdBy: AuthId,
      });

      // La imagen se sube una vez que se verificó nombre duplicado de evento, para evitar ocupar espacio innecesario en la nube
      if (file) {
        try {
          const imagenUrl = await this.cloudinaryService.uploadImage(file);
          createdEvento.set('imagenUrl', imagenUrl);
        } catch (error: any) {
          console.error('Error subiendo la imagen:', error.message);
        }
      }

      await createdEvento.save();

      return createdEvento;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Error creando el evento',
      );
    }
  }

  async findAll(): Promise<Evento[]> {
    return this.eventoModel.find().exec();
  }

  async findOne(id: string): Promise<Evento> {
    const evento = await this.eventoModel.findById(id).exec();
    if (!evento)
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    return evento;
  }

  async update(
    id: string,
    updateDto: UpdateEventoDto,
    authId: string,
    file?: Express.Multer.File,
  ): Promise<Evento> {
    const user = await this.usuariosService.find(authId);
    if (user!.rol !== Rol.PRODUCTOR)
      throw new ForbiddenException(
        'No tenés permiso para modificar este evento.',
      );

    const evento = await this.findOne(id);
    if (evento.createdBy !== authId)
      throw new ForbiddenException(
        'No tenés permiso para modificar este evento.',
      );

    //Verificar titulo repetido
    if (updateDto.titulo && updateDto.titulo !== evento.titulo) {
      const existente = await this.eventoModel.findOne({
        titulo: updateDto.titulo,
      });
      if (existente) {
        throw new BadRequestException('Ya existe un evento con ese título');
      }
    }

    // Subir nueva imagen, borrar la anterior
    let imagenUrl = evento.imagenUrl;

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
    const fechas = updateDto.fechas
      ? parseFechas(updateDto.fechas)
      : evento.fechas;

    const cantidadEntradas = toNumber(
      updateDto.cantidadEntradas,
      evento.cantidadEntradas,
    );

    const precioEntrada = toNumber(
      updateDto.precioEntrada,
      evento.precioEntrada,
    );

    const fechasConTickets = buildFechasConTickets(
      fechas,
      updateDto.titulo ?? evento.titulo,
      cantidadEntradas,
    );

    // Update
    evento.set({
      titulo: updateDto.titulo ?? evento.titulo,
      descripcion: updateDto.descripcion ?? evento.descripcion,
      ubicacion: updateDto.ubicacion ?? evento.ubicacion,
      fechas: fechasConTickets,
      cantidadEntradas,
      precioEntrada,
      imagenUrl,
    });

    await evento.save();

    return evento;
  }

  async remove(id: string, authId: string): Promise<Evento> {
    const user = await this.usuariosService.find(authId);
    if (user!.rol !== Rol.PRODUCTOR) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar este evento.',
      );
    }

    const evento = await this.findOne(id);
    if (evento.createdBy !== authId) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar este evento.',
      );
    }

    // Borrar imagen
    if (evento.imagenUrl) {
      try {
        await this.cloudinaryService.deleteImage(evento.imagenUrl);
      } catch (error) {
        throw new BadRequestException('Error al eliminar la imagen del evento');
      }
    }

    // Borrar evento
    const deletedEvent = await this.eventoModel.findByIdAndDelete(id).exec();

    return deletedEvent!;
  }
}
