import {
  IsString,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsString()
  @IsNotEmpty()
  eventDateId: string;

  @Min(1, { message: 'La cantidad de entradas debe ser al menos 1' })
  @Max(8, { message: 'La cantidad de entradas no puede ser mayor a 8' })
  quantity: number;
}
