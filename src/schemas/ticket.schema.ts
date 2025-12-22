import * as mongoose from 'mongoose';

export const TicketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventDateId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
  purchaserEmail: String,
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'cancelled'],
  },
  qrCodeUrl: String,
  verificationCode: String,
  verificationCodeExpiresAt: Date,
});
