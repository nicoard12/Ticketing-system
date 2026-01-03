import { Document } from 'mongoose';

export enum StatusTicket {
  PENDING_PAYMENT= "pending_payment",
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  USED = 'used',
}

export interface Ticket extends Document {
  readonly userId: string;
  readonly originalUserId: string;
  readonly event: string;
  readonly eventDateId: string;
  readonly quantity: number;
  readonly purchaserEmail: string;
  readonly status: StatusTicket;
  readonly payment_url: string;
  readonly paymentExpiresAt: Date;
  readonly price: number;
  readonly qrCode: string;
  readonly verificationCode: string;
  readonly verificationCodeExpiresAt: Date;
  readonly dateCreated: Date;
}
