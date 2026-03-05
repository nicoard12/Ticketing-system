import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Ticket } from 'src/tickets/interfaces/ticket.interface';

@WebSocketGateway({
  cors: {
    origin: '*', // ajustar en prod
  },
})
export class TicketsGateway {
  @WebSocketServer()
  server: Server;

  emitTicketUpdate(ticketId: string, status: string, ticket?: Ticket, ) {
    const safeTicket = ticket
      ? {
          _id: ticket._id,
          event: ticket.event,
          eventDateId: ticket.eventDateId,
          userId: ticket.userId,
          originalUserId: ticket.originalUserId,
          quantity: ticket.quantity,
          purchaserEmail: ticket.purchaserEmail,
          status: ticket.status,
          price: ticket.price,
          dateCreated: ticket.dateCreated,
        }
      : null;
    this.server.emit(`ticket-${ticketId}`, { ticket: safeTicket, status });
  }
}
