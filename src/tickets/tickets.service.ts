import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import mongoose, { Model, Types } from 'mongoose';
import { StatusTicket, Ticket } from 'src/interfaces/ticket.interface';
import { Rol, User } from 'src/interfaces/user.interface';
import { UsersService } from 'src/user/users.service';
import { EventsService } from 'src/events/events.service';

import {
  generateQrCode,
  generateVerificationCode,
  isTheSameCode,
  sendQrCode,
  sendVerificationCode,
} from './tickets.utils';

@Injectable()
export class TicketsService {
  constructor(
    @Inject('TICKET_MODEL') private ticketModel: Model<Ticket>,
    @Inject('DATABASE_CONNECTION')
    private readonly connection: typeof mongoose,
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
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      if (!Types.ObjectId.isValid(createTicketDto.event)) {
        throw new NotFoundException('Evento no encontrado');
      }

      const user = await this.verifyNormalUser(userId);

      const event = await this.eventsService.restarEntradas(
        createTicketDto.event,
        createTicketDto.eventDateId,
        createTicketDto.quantity,
        session,
      );

      const {
        verificationCode,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode();

      const [ticket] = await this.ticketModel.create(
        [
          {
            ...createTicketDto,
            userId: user.idAuth,
            purchaserEmail: user.email,
            status: StatusTicket.PENDING,
            price: event.precioEntrada,
            verificationCode: verificationCodeHash,
            verificationCodeExpiresAt,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      // mail afuera de la transacción
      sendVerificationCode(user.email, verificationCode).catch((err) =>
        console.error('Error enviando mail:', err),
      );

      return {
        _id: ticket._id,
        event,
        eventDateId: ticket.eventDateId,
        quantity: ticket.quantity,
        purchaserEmail: ticket.purchaserEmail,
        status: ticket.status,
        price: ticket.price,
      };
    } catch (error) {
      console.log('Error, ', error);
      await session.abortTransaction();
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Error creando el ticket');
    } finally {
      session.endSession();
    }
  }

  async verifyCode(userId: string, ticketId: string, code: number) {
    try {
      const user = await this.verifyNormalUser(userId);

      const ticket = await this.ticketModel.findOne({
        _id: ticketId,
        userId: user.idAuth, // Validar que el ticket pertenece al usuario autenticado
      });
      if (!ticket) {
        throw new BadRequestException(
          'El ticket no pertenece al usuario autenticado o no existe.',
        );
      }
      if (ticket.status !== StatusTicket.PENDING) {
        throw new BadRequestException(
          `Tu email ya fue verificado, encontrarás tu código QR en tu email.`,
        );
      }
      const currentTime = new Date();
      if (ticket.verificationCodeExpiresAt < currentTime) {
        throw new BadRequestException('El código de verificación ha expirado.');
      }
      if (!isTheSameCode(code.toString(), ticket.verificationCode)) {
        throw new BadRequestException('Código de verificación incorrecto.');
      }

      ticket.set({ status: StatusTicket.ACTIVE });

      const qrCode = generateQrCode();
      ticket.set({ qrCode });

      await ticket.save();

      sendQrCode(ticket.purchaserEmail, ticket.quantity, qrCode).catch(
        (
          err, //sin await para no bloquear el flujo y dar una mejor experiencia al usuario
        ) => console.error('Error enviando mail:', err),
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error verificando el código',
      );
    }
  }

  async sendCode(
    userId: string,
    ticketId: string,
    userObject: User | null = null,
  ) {
    try {
      const user = userObject ?? (await this.verifyNormalUser(userId));

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

      sendVerificationCode(
        updatedTicket.purchaserEmail,
        verificationCode,
      ).catch((err) => console.error('Error enviando mail:', err));

      return true;
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

      return true;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error cambiando el email del ticket',
      );
    }
  }

  async myTickets(userId: string) {
    try {
      const user = await this.verifyNormalUser(userId);
      const tickets = await this.ticketModel.find({ userId: user.idAuth }).select('-qrCode -verificationCode -verificationCodeExpiresAt')
      return tickets;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error obteniendo los tickets del usuario',
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
