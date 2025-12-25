import { Document } from 'mongoose';

export enum StatusTicket {
  PENDING = 'pending_verification',
  ACTIVE = 'active',
  TRANSFERRED = 'transferred',
  USED = 'used',
}

export interface Ticket extends Document {
  readonly userId: string;
  readonly originalUserId: string;
  readonly eventId: string;
  readonly eventDateId: string;
  readonly quantity: number;
  readonly purchaserEmail: string;
  readonly status: StatusTicket;
  readonly price: number;
  readonly qrCode: string;
  readonly verificationCode: string;
  readonly verificationCodeExpiresAt: Date;
}
