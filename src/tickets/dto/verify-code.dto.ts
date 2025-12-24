import { IsNumber } from 'class-validator';

export class VerifyCodeDto {
  @IsNumber({}, { message: 'El código debe ser un número.' })
  code: number;
}
