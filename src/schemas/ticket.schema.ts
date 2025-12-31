import * as mongoose from 'mongoose';

export const TicketSchema = new mongoose.Schema({
  userId: String,
  originalUserId: String,
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventDateId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
  purchaserEmail: String,
  status: {
    type: String,
    enum: ['pending_payment', 'pending_verification', 'active', 'used'],
  },
  payment_url: String,
  price: Number,
  qrCode: String,
  verificationCode: String,
  verificationCodeExpiresAt: Date,
  dateCreated: { type: Date, default: Date.now },
});

// TicketSchema.pre(/^find/, function (
//   this: mongoose.Query<any, any>,
//   next,
// ) {
//   this.populate('event');
//   next();
// });
