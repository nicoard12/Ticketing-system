import { IsEmail, IsNumber } from 'class-validator';

export class TransferTicketDto {
  @IsNumber()
  quantity: number;

  @IsEmail({}, { message: 'El email ingresado no es válido.' })
  email: string;
}
