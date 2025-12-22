import { Document } from 'mongoose';

export enum StatusTicket {
  PENDING = 'pending_verification',
  VERIFIED = 'verified',
  CANCELLED = 'cancelled',
}

export interface Ticket extends Document {
  readonly userId: string;
  readonly eventId: string;
  readonly eventDateId: string;
  readonly quantity: number;
  readonly purchaserEmail: string;
  readonly status: StatusTicket;
  readonly qrCodeUrl: string;
  readonly verificationCode: string;
  readonly verificationCodeExpiresAt: string;
}
