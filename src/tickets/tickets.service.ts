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
import { MercadopagoService } from 'src/mercadopago/mercadopago.service';

import {
  generateQrCode,
  generateVerificationCode,
  isPast,
  isTheSameCode,
  sendQrCode,
  sendVerificationCode,
} from './tickets.utils';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { ValidateQRDto } from './dto/validate-qr.dto';

@Injectable()
export class TicketsService {
  constructor(
    @Inject('TICKET_MODEL') private ticketModel: Model<Ticket>,
    @Inject('DATABASE_CONNECTION')
    private readonly connection: typeof mongoose,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly mpService: MercadopagoService,
  ) {}

  private async verifyNormalUser(userId: string) {
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

      const ticketPP = await this.ticketModel.findOne({
        userId: user.idAuth,
        status: StatusTicket.PENDING_PAYMENT,
        paymentExpiresAt: { $gt: new Date() },
        payment_url: { $exists: true, $nin: [null, ''] },
      })
      if (ticketPP) throw new BadRequestException("Tenes un pago pendiente, cancelalo o terminalo para comprar otro ticket.")

      const event = await this.eventsService.restarEntradas(
        createTicketDto.event,
        createTicketDto.eventDateId,
        createTicketDto.quantity,
        session,
      );

      const paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const [ticket] = await this.ticketModel.create(
        [
          {
            ...createTicketDto,
            userId: user.idAuth,
            purchaserEmail: user.email,
            status: StatusTicket.PENDING_PAYMENT,
            paymentExpiresAt,
            price: event.precioEntrada,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      //Logica mercadopago, si en este punto falla no se puede realizar rollback, 
      // pero igualmente hay(habrá) un CronJob para borrar tickets pendientes de pago vencidos
      const { url } = await this.mpService.createPayment(
        ticket._id.toString(),
        event.titulo,
        ticket.quantity,
        ticket.price,
      );

      ticket.set({
        payment_url: url
      })

      await ticket.save()

      return url;
    } catch (error) {
      console.log('Error, ', error);
      await session.abortTransaction();
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('Error creando el ticket');
    } finally {
      await session.endSession();
    }
  }

  async confirmPayment(ticketId: string, paymentId: number) {
    try {
      const ticket = await this.ticketModel.findById(ticketId);
      if (!ticket || ticket.paymentExpiresAt <= new Date()) console.log('REEMBOLSAR'); //TODO: Reembolsar creo que se usa paymentId

      if (ticket!.status !== StatusTicket.PENDING_PAYMENT) return true

      const {
        verificationCode,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode();

      ticket!.set({
        status: StatusTicket.PENDING,
        verificationCodeHash,
        verificationCodeExpiresAt,
      });

      await ticket!.save();

      sendVerificationCode(ticket!.purchaserEmail, verificationCode).catch(
        (err) => console.error('Error enviando mail:', err),
      );

      return true; //Respuesta a mercadoPago
    } catch (error) {
      console.log('Error confirmando el pago: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error al confirmar el pago',
      );
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

      const event = await this.eventsService.findOne(ticket.event);
      sendQrCode(qrCode, ticket, event).catch(
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
          status: StatusTicket.PENDING,
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
      const tickets = await this.ticketModel
        .find({
          $or: [{ userId: user.idAuth }, { originalUserId: user.idAuth }],
        })
        .select('-qrCode -verificationCode -verificationCodeExpiresAt')
        .populate('event');

      return tickets;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error obteniendo los tickets del usuario',
      );
    }
  }

  private async getValidTransferUser(email: string, userId: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user)
      throw new NotFoundException(
        'El email debe estar ligado a un usuario registrado',
      );

    if (user.rol !== Rol.NORMAL)
      throw new BadRequestException(
        'El usuario no debe tener permisos especiales',
      );

    if (user.idAuth == userId) {
      throw new BadRequestException(
        'No podes transferirte a vos mismo los tickets',
      );
    }

    return user;
  }

  async transferTicket(
    userId: string,
    ticketId: string,
    transferTicketDto: TransferTicketDto,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const user = await this.verifyNormalUser(userId);
      const transferUser = await this.getValidTransferUser(
        transferTicketDto.email,
        user.idAuth,
      );

      const {
        verificationCode,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode();

      const fullTransfer = await this.ticketModel.findOneAndUpdate(
        {
          _id: ticketId,
          userId: user.idAuth,
          originalUserId: { $exists: false }, //No debe existir, si existiera, significa que es ticket transferido, no se debe volver a transferir
          quantity: transferTicketDto.quantity, //Si transifere TODOS los tickets, actualizo el mismo documento
        },
        {
          $set: {
            originalUserId: user.idAuth,
            userId: transferUser.idAuth,
            status: StatusTicket.PENDING,
            purchaserEmail: transferUser.email,
            verificationCode: verificationCodeHash,
            verificationCodeExpiresAt,
            qrCode: null,
          },
        },
        { new: true, session },
      );

      if (!fullTransfer) {
        //No transfiere todos los tickets, resto cantidad a doc actual y creo nuevo ticket
        const updatedTicket = await this.ticketModel.findOneAndUpdate(
          {
            _id: ticketId,
            userId: user.idAuth,
            originalUserId: { $exists: false },
            quantity: { $gt: transferTicketDto.quantity }, //Verificar que la cantidad de tickets sea mayor a la que va a transferir
          },
          {
            $inc: { quantity: -transferTicketDto.quantity },
          },
          { new: true, session },
        );

        if (!updatedTicket) {
          throw new BadRequestException(
            'La cantidad de tickets tiene que ser menor o igual a las que compraste',
          );
        }

        const ticketObj = updatedTicket.toObject();
        const { _id, qrCode, ...ticketObjWithoutIdAndQr } = ticketObj;
        await this.ticketModel.create(
          [
            {
              ...ticketObjWithoutIdAndQr,
              userId: transferUser.idAuth,
              originalUserId: user.idAuth,
              quantity: transferTicketDto.quantity,
              purchaserEmail: transferUser.email,
              status: StatusTicket.PENDING,
              verificationCode: verificationCodeHash,
              verificationCodeExpiresAt,
            },
          ],
          { session },
        );
      }
      await session.commitTransaction();

      sendVerificationCode(transferUser.email, verificationCode).catch((err) =>
        console.error('Error enviando mail:', err),
      );
      return true;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error al transferir el ticket',
      );
    } finally {
      await session.endSession();
    }
  }

  async validateQR(userId: string, validateQRDto: ValidateQRDto) {
    try {
      const qrCode = validateQRDto.qrCode;
      const eventId = validateQRDto.eventId;
      const eventDateId = validateQRDto.eventDateId;
      const user = await this.usersService.find(userId);
      if (!user) throw new NotFoundException(`Usuario no encontrado`);
      if (user.rol != Rol.STAFF)
        throw new BadRequestException(
          `Solo usuarios staff pueden realizar esta acción.`,
        );

      const ticket = await this.ticketModel.findOne({ qrCode });
      if (!ticket)
        return {
          isValid: false,
          message: 'El código QR proporcionado no pertenece a ningún ticket.',
        };
      if (ticket.event.toString() !== eventId.toString())
        return {
          isValid: false,
          message: 'El ticket pertenece a otro evento.',
        };
      if (ticket.eventDateId.toString() !== eventDateId.toString())
        return {
          isValid: false,
          message: 'El ticket es para otra fecha del mismo evento.',
        };

      const event = await this.eventsService.findOne(eventId);
      const eventDate = event.fechas.find(
        (f) => f._id?.toString() === eventDateId.toString(),
      )?.fecha;
      if (isPast(eventDate!))
        throw new BadRequestException(
          'No podes validar QRs antes de la fecha del evento.',
        );

      if (ticket.status == StatusTicket.USED)
        return { isValid: false, message: 'El ticket ya fue usado.' };

      ticket.set({
        status: StatusTicket.USED,
      });

      await ticket.save();

      return {
        isValid: true,
        message: 'Ticket válido.',
        quantity: ticket.quantity,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error al validar el ticket',
      );
    }
  }

  async getPendingPayment(userId: string) {
    try {
      const user = await this.verifyNormalUser(userId);
      const ticketPP = await this.ticketModel.findOne({
        userId: user.idAuth,
        status: StatusTicket.PENDING_PAYMENT,
        paymentExpiresAt: { $gt: new Date() },
        payment_url: { $exists: true, $nin: [null, ''] },
      }).populate('event');

      return ticketPP
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error al obtener pago pendiente',
      );
    }
  }
}
