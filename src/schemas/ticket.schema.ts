import * as mongoose from 'mongoose';

export const TicketSchema = new mongoose.Schema({
  userId: String,
  originalUserId: String,
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventDateId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
  purchaserEmail: String,
  status: {
    type: String,
    enum: ['pending_verification', 'active', 'used'],
  },
  price: Number,
  qrCode: String,
  verificationCode: String,
  verificationCodeExpiresAt: Date,
});
