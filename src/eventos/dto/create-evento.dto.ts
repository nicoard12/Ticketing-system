import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsUrl,
  ArrayMinSize,
  IsDate,
} from 'class-validator';

export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsDate({ each: true })
  @ArrayMinSize(1)
  @Type(() => Date)
  fechas: Date[];

  @IsString()
  @IsNotEmpty()
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
