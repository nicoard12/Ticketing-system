import { IsEmail, IsNumber } from 'class-validator';

export class TransferTicketDto {
  @IsNumber()
  quantity: string;

  @IsEmail({}, { message: 'El email ingresado no es válido.' })
  email: string;
}
