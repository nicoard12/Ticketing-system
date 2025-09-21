import { Model } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
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
}
