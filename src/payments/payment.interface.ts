import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { RefundResponse } from 'mercadopago/dist/clients/paymentRefund/commonTypes';

export interface IPayment {
  createPayment(
    ticketId: string,
    ticketTitle: string,
    ticketQuantity: number,
    price: number,
    paymentExpiresAt: Date,
  ): Promise<string | undefined>;

  getPayment(paymentId: string): Promise<PaymentResponse>;

  refundPayment(paymentId: string): Promise<RefundResponse>;
}
