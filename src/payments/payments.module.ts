import { Module } from '@nestjs/common';
import { MercadopagoService } from './mercadopago.service';

@Module({
  providers: [
    {
      provide: "PAYMENT_PROVIDER",
      useClass: MercadopagoService,
    },
  ],
  exports: ["PAYMENT_PROVIDER"],
})
export class PaymentModule {}
