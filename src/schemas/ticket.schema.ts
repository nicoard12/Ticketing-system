import * as mongoose from 'mongoose';

export const TicketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventDateId: mongoose.Schema.Types.ObjectId,
  purchaserEmail: String,
  quantity: Number,
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'cancelled'],
  },
  qrCodeUrl: String,
  verificationCode: String,
  verificationCodeExpiresAt: String,
});
