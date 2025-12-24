import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Model, Types } from 'mongoose';
import { StatusTicket, Ticket } from 'src/interfaces/ticket.interface';
import { Rol, User } from 'src/interfaces/user.interface';
import { UsersService } from 'src/user/users.service';
import { EventsService } from 'src/events/events.service';

import { generateVerificationCode, sendMail } from './tickets.utils';

@Injectable()
export class TicketsService {
  constructor(
    @Inject('TICKET_MODEL') private ticketModel: Model<Ticket>,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
  ) {}

  async verifyNormalUser(userId: string) {
    const user = await this.usersService.find(userId);
    if (!user) throw new NotFoundException(`Usuario no encontrado`);
    if (user.rol != Rol.NORMAL)
      throw new BadRequestException(
        `Solo usuarios normales pueden realizar esta acción.`,
      );
    return user;
  }

  async create(userId: string, createTicketDto: CreateTicketDto) {
    try {
      if (!Types.ObjectId.isValid(createTicketDto.eventId)) {
        throw new NotFoundException(
          `Evento con id ${createTicketDto.eventId} no encontrado`,
        );
      }
      const user = await this.verifyNormalUser(userId);

      const event = await this.eventsService.restarEntradas(
        createTicketDto.eventId,
        createTicketDto.eventDateId,
        createTicketDto.quantity,
      );

      const {
        verificationCode,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode();

      const createdTicket = new this.ticketModel({
        ...createTicketDto,
        userId: user.idAuth,
        purchaserEmail: user.email,
        status: StatusTicket.PENDING,
        price: event.precioEntrada,
        verificationCode: verificationCodeHash,
        verificationCodeExpiresAt,
      });

      const savedTicket = await createdTicket.save();

      sendMail(user.email, verificationCode).catch(
        (
          err, //sin await para no bloquear el flujo y dar una mejor experiencia al usuario
        ) => console.error('Error enviando mail:', err),
      );

      return {
        _id: savedTicket._id,
        event: event,
        eventDateId: savedTicket.eventDateId,
        quantity: savedTicket.quantity,
        purchaserEmail: savedTicket.purchaserEmail,
        status: savedTicket.status,
        price: savedTicket.price,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error creando el ticket',
      );
    }
  }

  async sendCode(userId: string, ticketId: string, userObject: User | null = null) {
    try {
      const user = userObject ?? await this.verifyNormalUser(userId);

      const {
        verificationCode,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode(); 

      const updatedTicket = await this.ticketModel.findOneAndUpdate(
        {
          _id: ticketId,
          userId: user.idAuth, // Validar que el ticket pertenece al usuario autenticado
        },
        {
          verificationCode: verificationCodeHash,
          verificationCodeExpiresAt,
        },
        { new: true },
      );

      if (!updatedTicket) {
        throw new BadRequestException(
          'El ticket no pertenece al usuario autenticado o no existe.',
        );
      }

      sendMail(updatedTicket.purchaserEmail, verificationCode).catch((err) =>
        console.error('Error enviando mail:', err),
      );

      return updatedTicket;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error enviando el código',
      );
    }
  }

  async changeEmail(userId: string, ticketId: string, newEmail: string) {
    try {
      const user = await this.verifyNormalUser(userId);
      const updatedTicket = await this.ticketModel.findOneAndUpdate(
        {
          _id: ticketId,
          userId: user.idAuth, // Validar que el ticket pertenece al usuario autenticado
        },
        {
          purchaserEmail: newEmail,
        },
        { new: true },
      );
      if (!updatedTicket) {
        throw new BadRequestException(
          'El ticket no pertenece al usuario autenticado o no existe.',
        );
      }

      await this.sendCode(userId, ticketId, user);

      return updatedTicket;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error cambiando el email del ticket',
      );
    }
  }

  findAll() {
    return `This action returns all tickets`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticket`;
  }

}
