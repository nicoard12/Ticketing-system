import { Inject, Injectable } from '@nestjs/common';
import { ClientSession, Model } from 'mongoose';
import { StatusTicket, Ticket } from 'src/interfaces/ticket.interface';
import { User } from 'src/interfaces/user.interface';
import { CreateTicketDto } from '../tickets/dto/create-ticket.dto';
import { ITicketRepository } from 'src/interfaces/ticket-repository.interface';

@Injectable()
export class TicketMongoRepository implements ITicketRepository{
  constructor(
    @Inject('TICKET_MODEL')
    private readonly ticketModel: Model<Ticket>,
  ) {}

  async createTicket(
    createTicketDto: CreateTicketDto,
    user: User,
    precioEntrada: number,
    paymentExpiresAt: Date,
    session?: ClientSession,
  ): Promise<Ticket> {
    const [ticket] = await this.ticketModel.create(
      [
        {
          ...createTicketDto,
          userId: user.idAuth,
          purchaserEmail: user.email,
          status: StatusTicket.PENDING_PAYMENT,
          paymentExpiresAt,
          price: precioEntrada,
        },
      ],
      { session },
    );
    return ticket;
  }

  async createTransferTicket(
    updatedTicket: Ticket,
    userId: string,
    transferUser: User,
    quantity: number,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
    session?: ClientSession,
  ) {
    const ticketObj = updatedTicket.toObject();
    const { _id, qrCode, ...ticketObjWithoutIdAndQr } = ticketObj;
    await this.ticketModel.create(
      [
        {
          ...ticketObjWithoutIdAndQr,
          userId: transferUser.idAuth,
          originalUserId: userId,
          quantity: quantity,
          purchaserEmail: transferUser.email,
          status: StatusTicket.PENDING_VERIFICATION,
          verificationCode: verificationCodeHash,
          verificationCodeExpiresAt,
        },
      ],
      { session },
    );
  }

  async updatePaymentURL(
    ticket: Ticket,
    url: string | undefined,
  ): Promise<Ticket> {
    ticket.set({
      payment_url: url,
    });

    return await ticket.save();
  }

  async findById(id: string, session?: ClientSession): Promise<Ticket | null> {
    return await this.ticketModel.findById(id).session(session || null);
  }

  async findByIdAndUserAuthId(
    id: string,
    userId: string,
    session?: ClientSession,
  ): Promise<Ticket | null> {
    return this.ticketModel
      .findOne({
        _id: id,
        userId: userId,
      })
      .session(session || null);
  }

  async findByQrCode(qrCode: string): Promise<Ticket | null> {
    return this.ticketModel.findOne({ qrCode });
  }

  async updateToPendingVerification(
    ticket: Ticket,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
  ) {
    ticket!.set({
      status: StatusTicket.PENDING_VERIFICATION,
      verificationCode: verificationCodeHash,
      verificationCodeExpiresAt,
    });

    await ticket!.save();
  }

  async updateToUsed(ticket: Ticket) {
    ticket.set({
      status: StatusTicket.USED,
    });

    await ticket.save();
  }

  async deleteOne(
    ticket: Ticket,
    session?: ClientSession,
  ): Promise<Ticket | null> {
    return await ticket.deleteOne({ session: session || null });
  }

  async updateVerificationCode(
    ticketId: string,
    userId: string,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
  ): Promise<Ticket | null> {
    return this.ticketModel.findOneAndUpdate(
      {
        _id: ticketId,
        userId: userId,
        status: StatusTicket.PENDING_VERIFICATION,
      },
      {
        verificationCode: verificationCodeHash,
        verificationCodeExpiresAt,
      },
      { new: true },
    );
  }

  async updatePurchaserEmail(
    ticketId: string,
    userId: string,
    newEmail: string,
  ): Promise<Ticket | null> {
    return this.ticketModel.findOneAndUpdate(
      {
        _id: ticketId,
        userId: userId,
      },
      {
        purchaserEmail: newEmail,
      },
      { new: true },
    );
  }

  async findTicketsByUser(userId: string): Promise<Ticket[]> {
    return this.ticketModel
      .find({
        $or: [{ userId: userId }, { originalUserId: userId }],
      })
      .select('-qrCode -verificationCode -verificationCodeExpiresAt')
      .populate('event');
  }

  async findUserPendingTicket(idAuth: string): Promise<Ticket | null> {
    return this.ticketModel
      .findOne({
        userId: idAuth,
        status: StatusTicket.PENDING_PAYMENT,
        paymentExpiresAt: { $gt: new Date() },
        payment_url: { $exists: true, $nin: [null, ''] },
      })
      .populate('event');
  }

  async findExpiredPendingTickets(): Promise<Ticket[]> {
    const now = new Date();
    return this.ticketModel.find({
      status: StatusTicket.PENDING_PAYMENT,
      paymentExpiresAt: { $lte: now },
    });
  }

  async transferAllTickets(
    ticketId: string,
    userId: string,
    transferUser: User,
    quantity: number,
    verificationCodeHash: string,
    verificationCodeExpiresAt: Date,
    session?: ClientSession,
  ): Promise<Ticket | null> {
    return this.ticketModel.findOneAndUpdate(
      {
        _id: ticketId,
        userId: userId,
        originalUserId: { $exists: false }, //No debe existir, si existiera, significa que es ticket transferido, no se debe volver a transferir
        quantity: quantity, //Filtro por cantidad de tickets a transferir igual a las que compró
      },
      {
        $set: {
          originalUserId: userId,
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
  }

  async transferPartialTickets(
    ticketId: string,
    userId: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<Ticket | null> {
    return this.ticketModel.findOneAndUpdate(
      {
        _id: ticketId,
        userId: userId,
        originalUserId: { $exists: false },
        quantity: { $gt: quantity }, //Verificar que la cantidad de tickets sea mayor a la que va a transferir
      },
      {
        $inc: { quantity: -quantity },
      },
      { new: true, session },
    );
  }
}
