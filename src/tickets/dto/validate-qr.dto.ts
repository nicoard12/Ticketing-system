import { IsString } from 'class-validator';

export class ValidateQRDto {
  @IsString({
    message: 'El código QR proporcionado no pertenece a ningún ticket.',
  })
  qrCode: string;

  @IsString()
  eventId: string;

    @IsString()
  eventDateId: string;
}
