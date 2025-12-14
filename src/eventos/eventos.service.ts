import { Model } from 'mongoose';
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
import 'dotenv/config'; // para cargar variables de entorno
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

      // Crear documento en memoria
      const createdEvento = new this.eventoModel({
        ...createDto,
        fechas: fechasConTickets,
        cantidadEntradas,
        precioEntrada,
        createdBy: AuthId,
      });

      // Subir imagen solo si no hay duplicado
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
    AuthId,
    file?: Express.Multer.File,
  ): Promise<Evento> {
    const evento = await this.findOne(id);

    const user = await this.usuariosService.find(AuthId);

    if (evento.createdBy != AuthId || user!.rol != Rol.PRODUCTOR) {
      throw new ForbiddenException(
        'No tenés permiso para modificar este evento.',
      );
    }

    //Verificación manual de título repetido (si se intenta cambiar)
    if (updateDto.titulo && updateDto.titulo !== evento.titulo) {
      const existente = await this.eventoModel.findOne({
        titulo: updateDto.titulo,
      });
      if (existente) {
        throw new BadRequestException('Ya existe un evento con ese título');
      }
    }

    //Solo sube imagen si no hay conflicto de título
    let imagenUrl = evento.imagenUrl;
    if (file) {
      if (imagenUrl) await this.cloudinaryService.deleteImage(imagenUrl);
      imagenUrl = await this.cloudinaryService.uploadImage(file);
    }

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

    const updatedEvento = await this.eventoModel
      .findByIdAndUpdate(
        id,
        {
          ...evento.toObject(),
          ...updateDto,
          fechas: fechasConTickets,
          cantidadEntradas,
          precioEntrada,
          imagenUrl,
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedEvento) {
      throw new NotFoundException(
        `Evento con id ${id} no encontrado al actualizar`,
      );
    }

    return updatedEvento;
  }

  async remove(id: string, AuthId: string): Promise<Evento> {
    const evento = await this.findOne(id);

    const user = await this.usuariosService.find(AuthId);

    if (evento.createdBy != AuthId || user!.rol != Rol.PRODUCTOR) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar este evento.',
      );
    }

    if (evento.imagenUrl) {
      await this.cloudinaryService.deleteImage(evento.imagenUrl);
    }

    const deletedEvent = await this.eventoModel.findByIdAndDelete(id).exec();

    if (!deletedEvent) {
      throw new NotFoundException(
        `Evento con id ${id} no encontrado al eliminar`,
      );
    }
    return deletedEvent;
  }
}
