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

  async create(
    createEventoDto: any,
    file?: Express.Multer.File,
  ): Promise<Evento> {
    let imagenUrl: string | undefined;

    // Subir imagen si existe
    if (file) {
      imagenUrl = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'eventos' },
          (error, result) => {
            if (error) return reject(error);
            if (!result?.secure_url)
              return reject(
                new Error('No se pudo obtener la URL de Cloudinary'),
              );
            resolve(result.secure_url);
          },
        );
        stream.end(file.buffer);
      });
    }

    // Parsear fechas desde FormData (llegan como string JSON)
    const fechasArray: Date[] = JSON.parse(createEventoDto.fechas).map(
      (f: string) => new Date(f),
    );

    // Transformar números
    const cantidadEntradas = Number(createEventoDto.cantidadEntradas);
    const precioEntrada = Number(createEventoDto.precioEntrada);

    const { titulo, descripcion, ubicacion, ...rest } = createEventoDto;

    // Preparo fechas con tickets
    const fechasConTickets = fechasArray.map((f: Date) => ({
      titulo,
      fecha: f,
      ticketsDisponibles: cantidadEntradas,
    }));

    const createdEvento = new this.eventoModel({
      titulo,
      descripcion,
      cantidadEntradas,
      precioEntrada,
      ubicacion,
      ...rest,
      fechas: fechasConTickets,
      imagenUrl: imagenUrl,
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

  async update(
    id: string,
    updateEventoDto: any,
    file?: Express.Multer.File,
  ): Promise<Evento> {
    const eventoActual = await this.eventoModel.findById(id).exec();
    if (!eventoActual) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }

    let imagenUrl: string | undefined = eventoActual.imagenUrl;

    // Subir nueva imagen si existe y borrar la anterior
    if (file) {
      // Borrar imagen anterior en Cloudinary
      if (eventoActual.imagenUrl) {
        try {
          const url = eventoActual.imagenUrl;
          // Extraer la parte de la carpeta y el nombre sin extensión
          const parts = url.split('/');
          const fileNameWithExt = parts[parts.length - 1];
          const fileName = fileNameWithExt.split('.')[0];
          const folder = parts[parts.length - 2]; // 'eventos' en tu caso
          const publicId = `${folder}/${fileName}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Error borrando imagen en Cloudinary:', err);
        }
      }

      // Subir la nueva imagen
      imagenUrl = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'eventos' },
          (error, result) => {
            if (error) return reject(error);
            if (!result?.secure_url)
              return reject(
                new Error('No se pudo obtener la URL de Cloudinary'),
              );
            resolve(result.secure_url);
          },
        );
        stream.end(file.buffer);
      });
    }

    // Parsear fechas desde FormData (llegan como string JSON)
    const fechasArray: Date[] = updateEventoDto.fechas
      ? JSON.parse(updateEventoDto.fechas).map((f: string) => new Date(f))
      : eventoActual.fechas;

    // Transformar números
    const cantidadEntradas = updateEventoDto.cantidadEntradas
      ? Number(updateEventoDto.cantidadEntradas)
      : eventoActual.cantidadEntradas;

    const precioEntrada = updateEventoDto.precioEntrada
      ? Number(updateEventoDto.precioEntrada)
      : eventoActual.precioEntrada;

    const { titulo, descripcion, ubicacion, ...rest } = updateEventoDto;

    const fechasConTickets = fechasArray.map((f: Date) => ({
      titulo: titulo ?? eventoActual.titulo,
      fecha: f,
      ticketsDisponibles: cantidadEntradas,
    }));

    const updatedEvento = {
      titulo: titulo ?? eventoActual.titulo,
      descripcion: descripcion ?? eventoActual.descripcion,
      cantidadEntradas,
      precioEntrada,
      ubicacion: ubicacion ?? eventoActual.ubicacion,
      ...rest,
      fechas: fechasConTickets,
      imagenUrl: imagenUrl,
    };

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
        const url = evento.imagenUrl;
        // Extraer la parte de la carpeta y el nombre sin extensión
        const parts = url.split('/');
        const fileNameWithExt = parts[parts.length - 1];
        const fileName = fileNameWithExt.split('.')[0];
        const folder = parts[parts.length - 2]; // 'eventos' en tu caso
        const publicId = `${folder}/${fileName}`;
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
