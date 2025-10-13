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
  IsOptional,
} from 'class-validator';

export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  fechas: string; //en realidad es Date[] pero lo mando en formData asi que es necesario string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  descripcion: string;

  @Type(() => Number)
  @IsNotEmpty()
  @Min(1, { message: 'La cantidad de entradas debe ser mayor a 0' })
  cantidadEntradas: number;

  @Type(() => Number)
  @IsNotEmpty()
  @Min(0.01, { message: 'El precio de la entrada debe ser mayor a 0' })
  precioEntrada: number;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  imagenUrl: string;
}
