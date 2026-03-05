import { Inject, Injectable } from '@nestjs/common';
import { ClientSession, Model, Types } from 'mongoose';
import { Event, EventDate } from 'src/events/interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { IEventRepository } from 'src/events/interfaces/event-repository.interface';

@Injectable()
export class EventsMongoRepository implements IEventRepository {
  constructor(@Inject('EVENT_MODEL') private readonly model: Model<Event>) {}

  async create(
    eventData: CreateEventDto,
    fechas: EventDate[],
    imagenUrl: string,
  ): Promise<Event> {
    const newEvent = new this.model({
      ...eventData,
      fechas,
      imagenUrl,
    });

    return newEvent.save();
  }

  async findByTitle(titulo: string): Promise<Event | null> {
    return this.model.findOne({ titulo }).exec();
  }

  async findById(id: string): Promise<Event | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const event = await this.model.findById(id).exec();
    if (!event) return null;
    return event;
  }

  async findAll(): Promise<Event[]> {
    return this.model.find().exec();
  }

  async updateEvent(
    event: Event,
    updateDto: UpdateEventDto,
    fechasConTickets: EventDate[],
    precioEntrada: number,
    imagenUrl: string,
  ): Promise<Event> {
    event.set({
      titulo: updateDto.titulo ?? event.titulo,
      descripcion: updateDto.descripcion ?? event.descripcion,
      ubicacion: updateDto.ubicacion ?? event.ubicacion,
      fechas: fechasConTickets,
      precioEntrada,
      imagenUrl,
    });

    return await event.save();
  }

  async deleteEvent(id: string): Promise<Event | null> {
    return await this.model.findByIdAndDelete(id).exec();
  }

  async findUnaFecha(
    eventId: string,
    eventDateId: string,
    session?: ClientSession,
  ): Promise<Event | null> {
    if (!Types.ObjectId.isValid(eventId)) {
      return null;
    }
    return await this.model
      .findOne(
        {
          _id: eventId,
          'fechas._id': eventDateId,
        },
        { fechas: 1 },
      )
      .session(session || null);
  }

  async decrementTicketsForEventDate(
    eventId: string,
    eventDateId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<Event | null> {
    return await this.model.findOneAndUpdate(
      {
        _id: eventId,
        fechas: {
          $elemMatch: {
            _id: eventDateId,
            cantidadEntradas: { $gte: quantity },
          },
        },
      },
      {
        $inc: { 'fechas.$.cantidadEntradas': -quantity },
      },
      { new: true, session },
    );
  }

  async incrementTicketsForEventDate(
    eventId: string,
    eventDateId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<Event | null> {
    return await this.model.findOneAndUpdate(
      {
        _id: eventId,
        fechas: {
          $elemMatch: {
            _id: eventDateId,
          },
        },
      },
      {
        $inc: { 'fechas.$.cantidadEntradas': quantity },
      },
      { new: true, session },
    );
  }
}
