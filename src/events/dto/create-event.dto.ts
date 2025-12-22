import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  Min,
  IsUrl,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  titulo: string;

  @IsNotEmpty()
  fechas: string; //Es EventDate[] pero al traerlo en formData es string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  descripcion: string;

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

  @IsString()
  @IsOptional()
  createdBy: string;
}
