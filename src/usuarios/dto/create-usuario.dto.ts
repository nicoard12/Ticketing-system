import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Rol } from '../entities/usuario.entity';


export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  idAuth: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsEnum(Rol, {
    message: 'el rol debe ser productor, normal o staff',
  })
  @IsNotEmpty()
  rol: Rol;
  
}
