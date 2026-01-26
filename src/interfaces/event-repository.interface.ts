import { CreateEventDto } from "src/events/dto/create-event.dto";
import { Event, EventDate } from "./event.interface";
import { UpdateEventDto } from "src/events/dto/update-event.dto";

export interface IEventRepository {
  create(
    eventData: CreateEventDto,
    fechas: EventDate[],
    imagenUrl: string,
  ): Promise<Event>;

  findByTitle(titulo: string): Promise<Event | null>;

  findById(id: string): Promise<Event | null>;

  findAll(): Promise<Event[]>;

  updateEvent(
    event: Event,
    updateDto: UpdateEventDto,
    fechasConTickets: EventDate[],
    precioEntrada: number,
    imagenUrl: string,
  ): Promise<Event>;

  deleteEvent(id: string): Promise<Event | null>;

  findUnaFecha(
    eventId: string,
    eventDateId: string,
    session?: any, // Genérico para no atar a Mongo
  ): Promise<Event | null>;

  decrementTicketsForEventDate(
    eventId: string,
    eventDateId: string,
    quantity: number,
    session?: any,
  ): Promise<Event | null>;

  incrementTicketsForEventDate(
    eventId: string,
    eventDateId: string,
    quantity: number,
    session?: any,
  ): Promise<Event | null>;
}
