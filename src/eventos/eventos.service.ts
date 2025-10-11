import { Model } from 'mongoose';
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Evento } from '../interfaces/evento.interface';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Injectable()
export class EventosService {
  constructor(
    @Inject('EVENTO_MODEL')
    private eventoModel: Model<Evento>,
  ) {}

  async create(createEventoDto: CreateEventoDto): Promise<Evento> {
    const { titulo, fechas, cantidadEntradas, ...rest } = createEventoDto;

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
    console.log('Aca tambien llega,', updateEventoDto);
    const { titulo, fechas, cantidadEntradas, ...rest } = updateEventoDto;

    const fechasConTickets = fechas?.map((f) => ({
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

    const eventoActualizado = await this.eventoModel
      .findByIdAndUpdate(id, createdEvento, { new: true })
      .exec();
    if (!eventoActualizado) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    return eventoActualizado;
  }

  async remove(id: string): Promise<Evento> {
    const eventoEliminado = await this.eventoModel.findByIdAndDelete(id).exec();
    if (!eventoEliminado) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    return eventoEliminado;
  }
}