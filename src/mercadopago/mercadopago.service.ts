import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class MercadopagoService {
  private preference: Preference;
  private payment: Payment;

  constructor() {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });

    this.preference = new Preference(client);
    this.payment = new Payment(client);
  }

  async createPayment(
    ticketId: string,
    ticketTitle: string,
    ticketQuantity: number,
    price: number,
    paymentExpiresAt: Date,
  ) {
    const response = await this.preference.create({
      body: {
        items: [
          {
            id: ticketId,
            title: ticketTitle,
            quantity: ticketQuantity,
            unit_price: price,
            currency_id: 'ARS',
          },
        ],
        external_reference: ticketId,
        notification_url: `${process.env.API_URL}/tickets/confirm-payment`,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: paymentExpiresAt.toISOString(),
      },
    });

    return {
      url: response.init_point,
    };
  }

  async getPayment(paymentId: string) {
    const payment = await this.payment.get({
      id: paymentId,
    });

    return payment;
  }
}
