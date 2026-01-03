import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject, Injectable, Logger } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { StatusTicket, Ticket } from 'src/interfaces/ticket.interface';
import { EventsService } from 'src/events/events.service';

@Injectable()
export class TicketCleanupService {
  private readonly logger = new Logger(TicketCleanupService.name);

  constructor(
    @Inject('TICKET_MODEL') private ticketModel: Model<Ticket>,
    @Inject('DATABASE_CONNECTION')
    private readonly connection: typeof mongoose,
    private readonly eventsService: EventsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async removeExpiredPendingTickets() {
    const now = new Date();

    const tickets = await this.ticketModel.find({
      status: StatusTicket.PENDING_PAYMENT,
      paymentExpiresAt: { $lte: now },
    });

    for (const ticket of tickets) {
      const session = await this.connection.startSession();
      session.startTransaction();

      try {
        // Releer dentro de la transacción
        const freshTicket = await this.ticketModel
          .findById(ticket._id)
          .session(session);

        if (!freshTicket) {
          await session.abortTransaction();
          continue;
        }

        if (freshTicket.status !== StatusTicket.PENDING_PAYMENT) {
          await session.abortTransaction();
          continue;
        }

        await this.eventsService.sumarEntradas(
          freshTicket.event,
          freshTicket.eventDateId,
          freshTicket.quantity,
          session,
        );

        await freshTicket.deleteOne({ session });
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        this.logger.warn(
          `No se pudo limpiar ticket ${ticket._id}: ${err.message}`,
        );
      } finally {
        await session.endSession();
      }
    }
  }
}
