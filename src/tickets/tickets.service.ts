import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Model, Types } from 'mongoose';
import { Ticket } from 'src/interfaces/ticket.interface';
import { Rol } from 'src/interfaces/user.interface';
import { UsersService } from 'src/user/users.service';
import { EventsService } from 'src/events/events.service';

@Injectable()
export class TicketsService {
  constructor(
    @Inject('TICKET_MODEL') private ticketModel: Model<Ticket>,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
  ) {}

  async create(userId: string, createTicketDto: CreateTicketDto) {
    try {
      if (!Types.ObjectId.isValid(createTicketDto.eventId)) {
        throw new NotFoundException(
          `Evento con id ${createTicketDto.eventId} no encontrado`,
        );
      }
      const user = await this.usersService.find(userId);

      if (user?.rol != Rol.NORMAL)
        throw new BadRequestException(
          `Solo usuarios normales pueden comprar tickets.`,
        );

      const event = await this.eventsService.findOne(createTicketDto.eventId);

      if (!event)
        throw new NotFoundException(
          `No existe el evento con id ${createTicketDto.eventId}`,
        );
      const fecha = event.fechas.find(
        (f) => f._id!.toString() === createTicketDto.eventDateId,
      );
      if (!fecha)
        throw new NotFoundException(
          `No existe tal fecha para el evento ${event.titulo}`,
        );

      if (fecha.cantidadEntradas < createTicketDto.quantity) {
        throw new BadRequestException(
          `No hay suficientes tickets disponibles para la fecha seleccionada. Quedan ${fecha.cantidadEntradas} tickets.`,
        );
      }
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error creando el ticket',
      );
    }
  }

  findAll() {
    return `This action returns all tickets`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticket`;
  }

  update(id: number, updateTicketDto: UpdateTicketDto) {
    return `This action updates a #${id} ticket`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticket`;
  }
}
