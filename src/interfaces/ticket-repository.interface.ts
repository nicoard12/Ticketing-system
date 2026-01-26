import { CreateTicketDto } from "src/tickets/dto/create-ticket.dto";
import { Ticket } from "./ticket.interface";
import { User } from "./user.interface";

export interface ITicketRepository {
  createTicket(
    createTicketDto: CreateTicketDto,
    user: User,          
    precioEntrada: number,
    paymentExpiresAt: Date,
    session?: any,       // Genérico para no atar a Mongo
  ): Promise<Ticket>;

  createTransferTicket(
    updatedTicket: Ticket,
    userId: string,
    transferUser: User,
    quantity: number,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
    session?: any,
  ): Promise<void>;

  updatePaymentURL(ticket: Ticket, url: string | undefined): Promise<Ticket>;

  findById(id: string, session?: any): Promise<Ticket | null>;

  findByIdAndUserAuthId(
    id: string,
    userId: string,
    session?: any,
  ): Promise<Ticket | null>;

  findByQrCode(qrCode: string): Promise<Ticket | null>;

  updateToPendingVerification(
    ticket: Ticket,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
  ): Promise<void>;

  updateToUsed(ticket: Ticket): Promise<void>;

  deleteOne(ticket: Ticket, session?: any): Promise<Ticket | null>;

  updateVerificationCode(
    ticketId: string,
    userId: string,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
  ): Promise<Ticket | null>;

  updatePurchaserEmail(
    ticketId: string,
    userId: string,
    newEmail: string,
  ): Promise<Ticket | null>;

  findTicketsByUser(userId: string): Promise<Ticket[]>;

  findUserPendingTicket(idAuth: string): Promise<Ticket | null>;

  findExpiredPendingTickets(): Promise<Ticket[]>;

  transferAllTickets(
    ticketId: string,
    userId: string,
    transferUser: User,
    quantity: number,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
    session?: any,
  ): Promise<Ticket | null>;

  transferPartialTickets(
    ticketId: string,
    userId: string,
    quantity: number,
    session?: any,
  ): Promise<Ticket | null>;
}