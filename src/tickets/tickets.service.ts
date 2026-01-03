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
  canValidateQr,
  generateQrCode,
  generateVerificationCode,
  isTheSameCode,
  sendQrCode,
  sendTicketRefund,
  sendVerificationCode,
} from './tickets.utils';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { ValidateQRDto } from './dto/validate-qr.dto';
import { TicketsGateway } from './tickets.gateway';
import { PAYMENT_EXPIRATION } from './tickets.constants';

@Injectable()
export class TicketsService {
  constructor(
    @Inject('TICKET_MODEL') private ticketModel: Model<Ticket>,
    @Inject('DATABASE_CONNECTION')
    private readonly connection: typeof mongoose,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly mpService: MercadopagoService,
    private readonly ticketsGateway: TicketsGateway,
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
      });
      if (ticketPP)
        throw new BadRequestException(
          'Tenes un pago pendiente, cancelalo o terminalo para comprar otro ticket.',
        );

      const event = await this.eventsService.restarEntradas(
        createTicketDto.event,
        createTicketDto.eventDateId,
        createTicketDto.quantity,
        session,
      );

      const paymentExpiresAt = new Date(Date.now() + PAYMENT_EXPIRATION * 60 * 1000);
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
      //pero igualmente hay un Cronjob para borrar tickets pendientes con pagos vencidos
      const { url } = await this.mpService.createPayment(
        ticket._id.toString(),
        event.titulo,
        ticket.quantity,
        ticket.price,
        paymentExpiresAt,
      );

      ticket.set({
        payment_url: url,
      });

      await ticket.save();

      return {
        url,
        ticketId: ticket._id,
      };
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

  async confirmPayment(paymentId: string) {
    try {
      const payment = await this.mpService.getPayment(paymentId);
      if (payment.status !== 'approved') return true;

      const ticketId = payment.external_reference;
      if (!ticketId) return true;

      const ticket = await this.ticketModel.findById(ticketId);

      if (!ticket || ticket.paymentExpiresAt <= new Date()) {
        //Reembolso si no existe el ticket o si expiró el pago
        if (ticket) {
          //Si expiró el pago elimino el ticket
          await this.removePendingTicket(ticket.userId, ticket._id.toString());
        }
        await this.mpService.refundPayment(paymentId);
        sendTicketRefund(payment.transaction_amount, payment.payer?.email);
        this.ticketsGateway.emitTicketUpdate(ticketId!, 'FAILED');
        return true;
      }

      if (ticket.status !== StatusTicket.PENDING_PAYMENT) return true;

      const {
        verificationCode,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode();

      ticket!.set({
        status: StatusTicket.PENDING_VERIFICATION,
        verificationCode: verificationCodeHash,
        verificationCodeExpiresAt,
      });

      await ticket!.save();

      this.ticketsGateway.emitTicketUpdate(
        ticketId!,
        'PAID',
        ticket!.toObject(),
      );

      sendVerificationCode(ticket!.purchaserEmail, verificationCode).catch(
        (err) => console.error('Error enviando mail:', err),
      );

      return true;
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
      if (ticket.status !== StatusTicket.PENDING_VERIFICATION) {
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
          userId: user.idAuth,
          status: StatusTicket.PENDING_VERIFICATION,
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
          userId: user.idAuth,
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
            status: StatusTicket.PENDING_VERIFICATION,
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
              status: StatusTicket.PENDING_VERIFICATION,
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
      if (!canValidateQr(eventDate!))
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
      const ticketPP = await this.ticketModel
        .findOne({
          userId: user.idAuth,
          status: StatusTicket.PENDING_PAYMENT,
          paymentExpiresAt: { $gt: new Date() },
          payment_url: { $exists: true, $nin: [null, ''] },
        })
        .populate('event');

      return ticketPP;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error al obtener pago pendiente',
      );
    }
  }

  async removePendingTicket(userId: string, ticketId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const user = await this.verifyNormalUser(userId);
      const ticket = await this.ticketModel.findById(ticketId).session(session);

      // El cron ya lo borró, estado final correcto
      if (!ticket) {
        await session.abortTransaction();
        return true;
      }

      if (ticket.userId !== user.idAuth)
        throw new BadRequestException('El ticket no te pertenece');
      if (ticket.status !== StatusTicket.PENDING_PAYMENT)
        throw new BadRequestException('El ticket ya no está pendiente de pago');

      await this.eventsService.sumarEntradas(
        ticket.event,
        ticket.eventDateId,
        ticket.quantity,
        session,
      );

      await ticket.deleteOne({ session });
      await session.commitTransaction();

      return true;
    } catch (error) {
      await session.abortTransaction();

      // El cron ya lo borró, estado final correcto
      if (
        error?.errorLabels?.includes('TransientTransactionError') ||
        error?.code === 112
      ) {
        return true;
      }

      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException(
        error.message || 'Error al remover el ticket pendiente',
      );
    } finally {
      await session.endSession();
    }
  }
}
