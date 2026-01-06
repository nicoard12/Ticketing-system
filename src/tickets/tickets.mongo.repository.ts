import { Inject, Injectable } from '@nestjs/common';
import { ClientSession, Model } from 'mongoose';
import { StatusTicket, Ticket } from 'src/interfaces/ticket.interface';

@Injectable()
export class TicketMongoRepository {
  constructor(
    @Inject('TICKET_MODEL')
    private readonly ticketModel: Model<Ticket>,
  ) {}

  async findById(id: string, session?: ClientSession): Promise<Ticket | null> {
    return await this.ticketModel.findById(id).session(session || null);
  }

  async deleteOne(
    ticket: Ticket,
    session?: ClientSession,
  ): Promise<Ticket | null> {
    return await ticket.deleteOne({ session: session || null });
  }

  async findExpiredPendingTickets(): Promise<Ticket[]> {
    const now = new Date();
    return this.ticketModel.find({
      status: StatusTicket.PENDING_PAYMENT,
      paymentExpiresAt: { $lte: now },
    });
  }
}
