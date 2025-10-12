import { Model } from 'mongoose';
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Evento } from '../interfaces/evento.interface';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config'; // para cargar variables de entorno

@Injectable()
export class EventosService {
  constructor(
    @Inject('EVENTO_MODEL')
    private eventoModel: Model<Evento>,
  ) {
    // Configuración de Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async create(createEventoDto: CreateEventoDto): Promise<Evento> {
    const { titulo, fechas, cantidadEntradas, ...rest } = createEventoDto;

    // Preparo las fechas con tickets
    const fechasConTickets = fechas.map((f) => ({
      titulo: titulo,
      fecha: f,
      ticketsDisponibles: cantidadEntradas,
    }));

    const createdEvento = new this.eventoModel({
      titulo,
      cantidadEntradas,
      ...rest,
      fechas: fechasConTickets,
    });

    return createdEvento.save();
  }

  async findAll(): Promise<Evento[]> {
    return this.eventoModel.find().exec();
  }

  async findOne(id: string): Promise<Evento> {
    const evento = await this.eventoModel.findById(id).exec();
    if (!evento) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    return evento;
  }

  async update(id: string, updateEventoDto: UpdateEventoDto): Promise<Evento> {
    const { titulo, fechas, cantidadEntradas, imagenUrl, ...rest } = updateEventoDto;

    const eventoActual = await this.eventoModel.findById(id).exec();
    if (!eventoActual) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }

    // Si la imagen cambió, borro la anterior en Cloudinary
    if (
      imagenUrl &&
      eventoActual.imagenUrl &&
      imagenUrl !== eventoActual.imagenUrl
    ) {
      try {
        const segments = eventoActual.imagenUrl.split('/');
        const publicIdWithExt = segments[segments.length - 1];
        const publicId = publicIdWithExt.split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Error borrando imagen anterior en Cloudinary:', err);
      }
    }

    // Preparo las fechas con tickets
    const fechasConTickets = fechas?.map((f) => ({
      titulo: titulo || eventoActual.titulo,
      fecha: f,
      ticketsDisponibles: cantidadEntradas ?? eventoActual.cantidadEntradas,
    }));

    const updatedEvento = {
      titulo: titulo ?? eventoActual.titulo,
      cantidadEntradas: cantidadEntradas ?? eventoActual.cantidadEntradas,
      ...rest,
      fechas: fechasConTickets ?? eventoActual.fechas,
      imagenUrl: imagenUrl ?? eventoActual.imagenUrl,
    };

    // Actualizamos en Mongo
    const eventoActualizado = await this.eventoModel
      .findByIdAndUpdate(id, updatedEvento, { new: true })
      .exec();

    if (!eventoActualizado) {
      throw new NotFoundException(
        `Evento con id ${id} no encontrado al actualizar`,
      );
    }

    return eventoActualizado;
  }

  async remove(id: string): Promise<Evento> {
    const evento = await this.eventoModel.findById(id).exec();
    if (!evento) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }

    //Eliminar imagen de Cloudinary
    if (evento.imagenUrl) {
      try {
        const segments = evento.imagenUrl.split('/');
        const publicIdWithExt = segments[segments.length - 1];
        const publicId = publicIdWithExt.split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Error borrando imagen en Cloudinary:', err);
      }
    }

    const eventoEliminado = await this.eventoModel.findByIdAndDelete(id).exec();
    if (!eventoEliminado) {
      throw new NotFoundException(
        `Evento con id ${id} no encontrado al eliminar`,
      );
    }

    return eventoEliminado;
  }
}
