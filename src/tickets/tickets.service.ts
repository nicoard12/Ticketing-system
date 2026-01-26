import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { StatusTicket, Ticket } from 'src/interfaces/ticket.interface';
import { Rol, User } from 'src/interfaces/user.interface';
import { UsersService } from 'src/user/users.service';
import { EventsService } from 'src/events/events.service';
import {
  canValidateQr,
  generateQrCode,
  generateQrID,
  generateVerificationCode,
  isTheSameCode,
} from './tickets.utils';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { ValidateQRDto } from './dto/validate-qr.dto';
import { TicketsGateway } from './tickets.gateway';
import { PAYMENT_EXPIRATION } from './tickets.constants';
import { TransactionManager } from 'src/database/database-transaction.manager';
import { Event } from 'src/interfaces/event.interface';
import { type IPayment } from 'src/interfaces/payment.interface';
import { type ITicketRepository } from 'src/interfaces/ticket-repository.interface';
import { type IEmail } from 'src/interfaces/email.interface';

@Injectable()
export class TicketsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    @Inject('EMAIL_PROVIDER')
    private readonly emailsService: IEmail,
    @Inject('PAYMENT_PROVIDER')
    private readonly paymentService: IPayment,
    @Inject('TICKET_REPOSITORY')
    private readonly ticketRepository: ITicketRepository,
    private readonly transactionManager: TransactionManager,
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
    let ticket: Ticket;
    let event: Event;

    const paymentExpiresAt = new Date(
      Date.now() + PAYMENT_EXPIRATION * 60 * 1000,
    );

    await this.transactionManager.runInTransaction(async (session) => {
      const user = await this.verifyNormalUser(userId);

      const ticketPP = await this.ticketRepository.findUserPendingTicket(
        user.idAuth,
      );
      if (ticketPP) {
        throw new BadRequestException(
          'Tenés un pago pendiente, cancelalo o terminalo para comprar otro ticket.',
        );
      }

      event = await this.eventsService.restarEntradas(
        createTicketDto.event,
        createTicketDto.eventDateId,
        createTicketDto.quantity,
        session,
      );

      ticket = await this.ticketRepository.createTicket(
        createTicketDto,
        user,
        event.precioEntrada,
        paymentExpiresAt,
        session,
      );
    });

    const url = await this.paymentService.createPayment(
      //Puede fallar en este punto, no hay rollback pero el cronjob se encarga de limpiar el ticket creado y restockear entradas
      ticket!._id.toString(),
      event!.titulo,
      ticket!.quantity,
      ticket!.price,
      paymentExpiresAt,
    );

    await this.ticketRepository.updatePaymentURL(ticket!, url);

    return {
      url,
      ticketId: ticket!._id,
    };
  }

  async confirmPayment(paymentId: string) {
    try {
      const payment = await this.paymentService.getPayment(paymentId);
      if (payment.status !== 'approved') return true;

      const ticketId = payment.external_reference;
      if (!ticketId) return true;

      const ticket = await this.ticketRepository.findById(ticketId);

      if (!ticket || ticket.paymentExpiresAt <= new Date()) {
        //Reembolso si no existe el ticket o si expiró el pago
        if (ticket) {
          //Si expiró el pago elimino el ticket
          await this.removePendingTicket(ticket.userId, ticket._id.toString());
        }
        await this.paymentService.refundPayment(paymentId);
        this.emailsService.sendTicketRefund(
          payment.transaction_amount,
          payment.payer?.email,
        );
        this.ticketsGateway.emitTicketUpdate(ticketId!, 'FAILED');
        return true;
      }

      if (ticket.status !== StatusTicket.PENDING_PAYMENT) return true;

      const {
        verificationCode,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode();

      await this.ticketRepository.updateToPendingVerification(
        ticket,
        verificationCodeHash,
        verificationCodeExpiresAt,
      );

      this.ticketsGateway.emitTicketUpdate(
        ticketId!,
        'PAID',
        ticket!.toObject(),
      );

      this.emailsService
        .sendVerificationCode(ticket!.purchaserEmail, verificationCode)
        .catch((err) => console.error('Error enviando mail:', err));

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error al confirmar el pago',
      );
    }
  }

  async verifyCode(userId: string, ticketId: string, code: number) {
    try {
      const user = await this.verifyNormalUser(userId);

      const ticket = await this.ticketRepository.findByIdAndUserAuthId(
        ticketId,
        user.idAuth,
      );
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

      const qrID = generateQrID();
      const event = await this.eventsService.findById(ticket.event);
      this.emailsService
        .sendQrCode(await generateQrCode(qrID), ticket, event)
        .catch((err) => console.error('Error enviando mail:', err));

      ticket.set({ status: StatusTicket.ACTIVE });
      ticket.set({ qrID });

      await ticket.save();

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

      const updatedTicket = await this.ticketRepository.updateVerificationCode(
        ticketId,
        user.idAuth,
        verificationCodeHash,
        verificationCodeExpiresAt,
      );

      if (!updatedTicket) {
        throw new BadRequestException(
          'El ticket no pertenece al usuario autenticado o no existe.',
        );
      }

      this.emailsService
        .sendVerificationCode(updatedTicket.purchaserEmail, verificationCode)
        .catch((err) => console.error('Error enviando mail:', err));

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
      const updatedTicket = await this.ticketRepository.updatePurchaserEmail(
        ticketId,
        user.idAuth,
        newEmail,
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
      const tickets = await this.ticketRepository.findTicketsByUser(
        user.idAuth,
      );
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
    let verificationCode: string;

    await this.transactionManager.runInTransaction(async (session) => {
      const user = await this.verifyNormalUser(userId);
      const transferUser = await this.getValidTransferUser(
        transferTicketDto.email,
        user.idAuth,
      );

      const {
        verificationCode: code,
        verificationCodeHash,
        verificationCodeExpiresAt,
      } = generateVerificationCode();

      verificationCode = code;

      const fullTransfer = await this.ticketRepository.transferAllTickets(
        ticketId,
        user.idAuth,
        transferUser,
        transferTicketDto.quantity,
        verificationCodeHash,
        verificationCodeExpiresAt,
        session,
      );

      if (!fullTransfer) {
        const updatedTicket =
          await this.ticketRepository.transferPartialTickets(
            ticketId,
            user.idAuth,
            transferTicketDto.quantity,
            session,
          );

        if (!updatedTicket) {
          throw new BadRequestException(
            'La cantidad de tickets tiene que ser menor o igual a las que compraste',
          );
        }

        await this.ticketRepository.createTransferTicket(
          updatedTicket,
          user.idAuth,
          transferUser,
          transferTicketDto.quantity,
          verificationCodeHash,
          verificationCodeExpiresAt,
          session,
        );
      }
    });

    this.emailsService
      .sendVerificationCode(transferTicketDto.email, verificationCode!)
      .catch((err) => console.error('Error enviando mail:', err));

    return true;
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

      const ticket = await this.ticketRepository.findByQrCode(qrCode);
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

      const event = await this.eventsService.findById(eventId);
      const eventDate = event.fechas.find(
        (f) => f._id?.toString() === eventDateId.toString(),
      )?.fecha;
      if (!canValidateQr(eventDate!))
        throw new BadRequestException(
          'No podes validar QRs antes de la fecha del evento.',
        );

      if (ticket.status == StatusTicket.USED)
        return { isValid: false, message: 'El ticket ya fue usado.' };

      await this.ticketRepository.updateToUsed(ticket);

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
      const ticketPP = await this.ticketRepository.findUserPendingTicket(
        user.idAuth,
      );

      return ticketPP;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Error al obtener pago pendiente',
      );
    }
  }

  async removePendingTicket(userId: string, ticketId: string) {
    return await this.transactionManager
      .runInTransaction(async (session) => {
        const user = await this.verifyNormalUser(userId);

        const ticket = await this.ticketRepository.findByIdAndUserAuthId(
          ticketId,
          user.idAuth,
          session,
        );

        // El cron ya lo borró, estado final correcto
        if (!ticket) return;

        if (ticket.userId !== user.idAuth) {
          throw new BadRequestException('El ticket no te pertenece');
        }

        if (ticket.status !== StatusTicket.PENDING_PAYMENT) {
          throw new BadRequestException(
            'El ticket ya no está pendiente de pago',
          );
        }

        await this.eventsService.sumarEntradas(
          ticket.event,
          ticket.eventDateId,
          ticket.quantity,
          session,
        );

        await this.ticketRepository.deleteOne(ticket, session);
        return true;
      })
      .catch((error) => {
        if (error?.code === 112) return true;
        if (error instanceof HttpException) throw error;
        throw new InternalServerErrorException(error.message);
      });
  }
}
