import { Injectable } from '@nestjs/common';
import MercadoPagoConfig, { Preference } from 'mercadopago';

@Injectable()
export class MercadopagoService {
  private preference: Preference;

  constructor() {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });

    this.preference = new Preference(client);
  }

  async createPayment(
    ticketId: string,
    ticketTitle: string,
    ticketQuantity: number,
    price: number,
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
      },
    });

    return {
      url: response.init_point,
    };
  }
}
