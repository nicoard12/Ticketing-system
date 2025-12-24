import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChangeEmailDto {
  @IsEmail({}, { message: 'El email ingresado no es válido.' })
  newEmail: string;
}
