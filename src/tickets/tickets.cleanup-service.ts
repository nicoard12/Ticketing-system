import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { StatusTicket } from 'src/interfaces/ticket.interface';
import { EventsService } from 'src/events/events.service';
import { TicketMongoRepository } from './tickets.mongo.repository';
import { TransactionManager } from 'src/database/database-transaction.manager';

@Injectable()
export class TicketCleanupService {
  private readonly logger = new Logger(TicketCleanupService.name);

  constructor(
    private readonly ticketRepository: TicketMongoRepository,
    private readonly transactionManager: TransactionManager,
    private readonly eventsService: EventsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async removeExpiredPendingTickets() {
    const tickets = await this.ticketRepository.findExpiredPendingTickets();

    for (const ticket of tickets) {
      try {
        await this.transactionManager.runInTransaction(async (session) => {
          const freshTicket = await this.ticketRepository.findById(
            ticket._id.toString(),
            session,
          );

          if (!freshTicket) return;
          if (freshTicket.status !== StatusTicket.PENDING_PAYMENT) return;

          await this.eventsService.sumarEntradas(
            freshTicket.event,
            freshTicket.eventDateId,
            freshTicket.quantity,
            session,
          );

          await this.ticketRepository.deleteOne(freshTicket, session);
        });
      } catch (err) {
        this.logger.warn(
          `No se pudo limpiar ticket ${ticket._id}: ${err.message}`,
        );
      }
    }
  }
}
