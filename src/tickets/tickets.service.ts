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
import { StatusTicket, Ticket } from 'src/interfaces/ticket.interface';
import { Rol } from 'src/interfaces/user.interface';
import { UsersService } from 'src/user/users.service';
import { EventsService } from 'src/events/events.service';
import * as crypto from 'crypto';

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

      await this.eventsService.restarEntradas(
        createTicketDto.eventId,
        createTicketDto.eventDateId,
        createTicketDto.quantity,
      );

      const verificationCode = crypto.randomBytes(16).toString('hex');

      const verificationCodeHash = crypto
        .createHash('sha256')
        .update(verificationCode)
        .digest('hex');

      const verificationCodeExpiresAt = new Date(
        Date.now() + 10 * 60 * 1000, // 10 minutos
      );

      const createdTicket = new this.ticketModel({
        ...createTicketDto,
        purchaserEmail: user.email,
        status: StatusTicket.PENDING,
        verificationCode: verificationCodeHash,
        verificationCodeExpiresAt,
      });

      //TODO: enviar email de verificacion

      return createdTicket.save();
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
