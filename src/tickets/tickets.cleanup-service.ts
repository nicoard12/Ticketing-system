import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { StatusTicket } from 'src/interfaces/ticket.interface';
import { EventsService } from 'src/events/events.service';
import { TransactionManager } from 'src/database/database-transaction.manager';
import { type ITicketRepository } from 'src/interfaces/ticket-repository.interface';

@Injectable()
export class TicketCleanupService {
  private readonly logger = new Logger(TicketCleanupService.name);

  constructor(
    @Inject('TICKET_REPOSITORY')
    private readonly ticketRepository: ITicketRepository,
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
