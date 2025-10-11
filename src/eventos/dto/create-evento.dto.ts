import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsUrl,
  ArrayMinSize,
  IsDate,
  MaxLength,
} from 'class-validator';

export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  titulo: string;

  @IsDate({ each: true })
  @ArrayMinSize(1)
  @Type(() => Date)
  fechas: Date[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  descripcion: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  cantidadEntradas: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  precioEntrada: number;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @IsUrl()
  @IsNotEmpty()
  imagenUrl: string;
}
