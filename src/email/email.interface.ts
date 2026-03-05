import { Event } from '../events/interfaces/event.interface';
import { Ticket } from '../tickets/interfaces/ticket.interface';

export interface IEmail {
  sendVerificationCode(email: string, verificationCode: string): Promise<void>;
  sendQrCode(qrCode: Buffer, ticket: Ticket, event: Event): Promise<void>;
  sendTicketRefund(
    amount: number | undefined,
    email: string | undefined,
  ): Promise<void>;
}
